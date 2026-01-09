import { User } from "@/src/types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "USERS";
const SESSION_KEY = "SESSION";

export async function register(email: string, password: string) {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  const users: User[] = raw ? JSON.parse(raw) : [];

  if (users.find(u => u.email === email)) {
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

export async function login(email: string, password: string) {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  const users: User[] = raw ? JSON.parse(raw) : [];

  const user = users.find(u => u.email === email && u.password === password);
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
