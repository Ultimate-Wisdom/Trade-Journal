import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// ==========================================
// 🔒 SECURE CREDENTIALS (ENV VARIABLES)
// ==========================================
if (!process.env.MASTER_USERNAME) {
  throw new Error(
    "MASTER_USERNAME environment variable is required. Server cannot start without it.",
  );
}
if (!process.env.MASTER_PASSWORD) {
  throw new Error(
    "MASTER_PASSWORD environment variable is required. Server cannot start without it.",
  );
}

const MASTER_USERNAME = process.env.MASTER_USERNAME;
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

// ==========================================
// PASSWORD HASHING
// ==========================================
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// ==========================================
// SETUP AUTHENTICATION
// ==========================================
export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET environment variable is required. Server cannot start without it.",
    );
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false, // 🔴 Force false for Replit compatibility
      httpOnly: true, // Prevent XSS attacks
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // 1. AUTO-CREATE MASTER USER ON STARTUP
  (async () => {
    try {
      const existingUser = await storage.getUserByUsername(MASTER_USERNAME);

      if (!existingUser) {
        console.log(`🔒 Creating Master User: ${MASTER_USERNAME}...`);
        const hashedPassword = await hashPassword(MASTER_PASSWORD);
        await storage.createUser({
          username: MASTER_USERNAME,
          password: hashedPassword,
        });
        console.log("✅ Master User created successfully.");
      } else {
        console.log(`✅ Master User '${MASTER_USERNAME}' verified.`);
      }
    } catch (error) {
      console.error("❌ Error creating master user:", error);
    }
  })();

  // 2. PASSPORT STRATEGY
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  // 3. AUTHENTICATION ROUTES
  app.post("/api/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (err: any, user: SelectUser | false, info: any) => {
        if (err) return next(err);
        if (!user)
          return res.status(401).json({ message: "Invalid credentials" });

        req.login(user, (err) => {
          if (err) return next(err);
          res.status(200).json(user);
        });
      },
    )(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
