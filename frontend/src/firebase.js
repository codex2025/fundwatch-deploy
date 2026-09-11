import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Public client config -- Firebase web API keys are not secrets, they only
// identify the project; access is enforced by Firebase Auth + backend token
// verification, not by hiding this object.
const firebaseConfig = {
  apiKey: 'AIzaSyBf_KiOAZWnDO4pLhwMVW3-A02FVTd6kkk',
  authDomain: 'attendance-c7044.firebaseapp.com',
  projectId: 'attendance-c7044',
  storageBucket: 'attendance-c7044.firebasestorage.app',
  messagingSenderId: '59222340589',
  appId: '1:59222340589:web:bef79515f3728f7f336de4',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
