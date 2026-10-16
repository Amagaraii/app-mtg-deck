import { User } from "@/src/types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "USERS";
const SESSION_KEY = "SESSION";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function validate(email: string, password: string) {
  if (!email) throw new Error("Email requis");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email invalide");
  if (!password) throw new Error("Mot de passe requis");
}

export async function register(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  validate(email, password);
  if (password.length < 6) {
    throw new Error("Le mot de passe doit faire au moins 6 caractères");
  }

  const raw = await AsyncStorage.getItem(USERS_KEY);
  const users: User[] = raw ? JSON.parse(raw) : [];

  if (users.find((u) => u.email.toLowerCase() === email)) {
    throw new Error("Email déjà utilisé");
  }

  const newUser: User = {
    id: Date.now().toString(),
    email,
    password,
  };

  users.push(newUser);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newUser));

  return newUser;
}

export async function login(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  validate(email, password);

  const raw = await AsyncStorage.getItem(USERS_KEY);
  const users: User[] = raw ? JSON.parse(raw) : [];

  const user = users.find(
    (u) => u.email.toLowerCase() === email && u.password === password
  );
  if (!user) throw new Error("Identifiants invalides");

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function logout() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getSession(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}