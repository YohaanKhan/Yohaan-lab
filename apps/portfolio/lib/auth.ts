import { supabase } from "./supabase";

export async function signUp(email: string, password: string, username: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }, // passed to raw_user_meta_data, read by the DB trigger
    },
  });
  if (error) throw error;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}