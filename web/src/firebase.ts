import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyACA5xHgCZ14vnbSo5b0C28XnB0FhNRTYA',
  authDomain: 'nave-a0989.firebaseapp.com',
  projectId: 'nave-a0989',
  storageBucket: 'nave-a0989.firebasestorage.app',
  messagingSenderId: '667996115450',
  appId: '1:667996115450:web:813bad3db48a722f149443',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Apple Sign-In on web requires:
//   1. A Services ID registered in Apple Developer portal (developer.apple.com)
//   2. Sign In with Apple enabled and configured in Firebase console
//      > Authentication > Sign-in providers > Apple
//   3. naveapp.co (and nave-a0989.firebaseapp.com) added to Apple's authorized redirect domains
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export default app;
