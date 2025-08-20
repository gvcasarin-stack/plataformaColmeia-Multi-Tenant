import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { cookies } from 'next/headers';
import { setUserRole, getUserRole } from '@/lib/utils/roles';

export async function login(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user role
    const role = await getUserRole(user.uid);
    
    // Set cookies
    cookies().set('authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    cookies().set('user_role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    return { user, role };
  } catch (error) {
    throw error;
  }
}

export async function register(email: string, password: string, role: 'admin' | 'client') {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set user role
    await setUserRole(user.uid, role);
    
    return user;
  } catch (error) {
    throw error;
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    cookies().delete('authenticated');
    cookies().delete('user_role');
  } catch (error) {
    throw error;
  }
} 