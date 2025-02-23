import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get, child } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCKLJQy3jdU56JkIVRgRor0f1h-wfB8jjw",
  authDomain: "pencil-test-86e67.firebaseapp.com",
  databaseURL: "https://pencil-test-86e67-default-rtdb.firebaseio.com",
  projectId: "pencil-test-86e67",
  storageBucket: "pencil-test-86e67.firebasestorage.app",
  messagingSenderId: "731979958950",
  appId: "1:731979958950:web:a3beb600d4920036700267",
  measurementId: "G-LSP9LX7K3D"
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app;
  private db;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.db = getDatabase(this.app);
  }

  async createGame(): Promise<string> {
    const gameId = Math.random().toString(36).substring(2, 8);
    await set(ref(this.db, `games/${gameId}`), {
      status: 'waiting',
      currentTurn: 'white',
      board: 'start',
      players: {
        white: null,
        black: null
      }
    });
    return gameId;
  }

  async joinGame(gameId: string): Promise<boolean> {
    const gameRef = ref(this.db, `games/${gameId}`);
    const snapshot = await get(child(ref(this.db), `games/${gameId}`));
    
    if (!snapshot.exists() || snapshot.val().status !== 'waiting') {
      return false;
    }

    await set(gameRef, {
      ...snapshot.val(),
      status: 'playing',
      players: {
        ...snapshot.val().players,
        black: true
      }
    });
    return true;
  }

  watchGame(gameId: string, callback: (data: any) => void) {
    const gameRef = ref(this.db, `games/${gameId}`);
    onValue(gameRef, (snapshot) => {
      callback(snapshot.val());
    });
  }

  async updateGame(gameId: string, data: any) {
    await set(ref(this.db, `games/${gameId}`), data);
  }

  async exitGame(gameId: string, playerColor: 'white' | 'black') {
    const gameRef = ref(this.db, `games/${gameId}`);
    await set(gameRef, {
      status: 'player_left',
      leftPlayer: playerColor,
      board: 'start',
      currentTurn: 'white',
      players: {
        white: null,
        black: null
      }
    });
  }
} 
