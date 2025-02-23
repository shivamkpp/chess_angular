import { Component, ViewChild } from '@angular/core';
import { NgxChessBoardView } from 'ngx-chess-board';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-chess-board',
  template: `
    <div class="chess-container">
      <div *ngIf="!gameId" class="game-setup">
        <button (click)="createNewGame()">Create New Game</button>
        <div>
          <input [(ngModel)]="joinGameId" placeholder="Enter game code">
          <button (click)="joinGame()">Join Game</button>
        </div>
      </div>

      <div *ngIf="gameId" class="game-info">
        <div class="info">
          <p>Game Code: {{gameId}}</p>
          <p>Playing as: {{playerColor}}</p>
          <p>Current Turn: {{isWhiteTurn ? 'White' : 'Black'}}</p>
        </div>
        <button class="exit-button" (click)="exitGame()">Exit Game</button>
      </div>

      <ngx-chess-board 
        #board
        [size]="600"
        [lightTileColor]="lightTileColor"
        [darkTileColor]="darkTileColor"
        [lightDisabled]="!canMove()"
        [darkDisabled]="!canMove()"
        [showCoords]="true"
        [dragDisabled]="!canMove()"
        [drawDisabled]="true"
        [showLastMove]="true"
        (moveChange)="onMove()">
      </ngx-chess-board>

      <div *ngIf="gameFinished" class="game-over">
        <h2>Game Over!</h2>
        <p>{{gameOverMessage}}</p>
        <button (click)="exitGame()">Exit Game</button>
      </div>
    </div>
  `,
  styleUrls: ['./chess-board.component.css']
})
export class ChessBoardComponent {
  @ViewChild('board') board!: NgxChessBoardView;
  
  lightTileColor: string = '#EEEED2';
  darkTileColor: string = '#769656';
  
  gameId: string = '';
  joinGameId: string = '';
  playerColor: 'white' | 'black' | null = null;
  isWhiteTurn: boolean = true;
  gameFinished: boolean = false;
  gameOverMessage: string = '';
  isReversed: boolean = false;
  
  constructor(private firebaseService: FirebaseService) {}

  async createNewGame() {
    this.gameId = await this.firebaseService.createGame();
    this.playerColor = 'white';
    this.isReversed = false;
    this.setupGameWatch();
  }

  async joinGame() {
     if (await this.firebaseService.joinGame(this.joinGameId)) {
        
         this.gameId = this.joinGameId;
        
         this.playerColor = 'black';
        
         this.setupGameWatch();
        
         setTimeout(() => {
             this.board.reverse();
            
            
            this.isReversed = true;
        }, 100); 
    }
}

private setupGameWatch() {
    this.firebaseService.watchGame(this.gameId, (gameData) => {
      if (gameData.board !== 'start' && gameData.board !== this.board.getFEN()) {
        // Store current orientation before setting FEN
        const wasReversed = this.playerColor === 'black';
        
        // Update board state
        this.board.setFEN(gameData.board);
        
        // Always re-reverse for black player after any board state change
        if (wasReversed) {
          setTimeout(() => {
            this.board.reverse();
          }, 100);
        }
      }
      
      this.isWhiteTurn = gameData.currentTurn === 'white';
      
      if (gameData.status === 'finished') {
        this.gameFinished = true;
        this.gameOverMessage = gameData.winner + ' wins!';
      }
    });
  }

  canMove(): boolean {
    return this.playerColor === (this.isWhiteTurn ? 'white' : 'black');
  }

  async onMove() {
    const lastMove = this.board.getMoveHistory().slice(-1)[0];
    
    if (lastMove.mate) {
        const winner = this.isWhiteTurn ? 'White' : 'Black';
        alert(`${winner} player wins!`);
        
        // Notify the other player and reset the game state
        await this.firebaseService.updateGame(this.gameId, {
            board: 'start',
            currentTurn: 'white',
            status: 'finished',
            winner: winner
        });

        this.resetBoards();
    } else {
        await this.firebaseService.updateGame(this.gameId, {
            board: this.board.getFEN(),
            currentTurn: this.isWhiteTurn ? 'black' : 'white',
            status: 'playing',
            winner: null
        });
    }
  }

  async exitGame() {
    if (this.gameId) {
      // Notify other player through Firebase
      await this.firebaseService.exitGame(this.gameId, this.playerColor!);
    }
    
    // Reset local game state
    this.gameId = '';
    this.joinGameId = '';
    this.playerColor = null;
    this.isWhiteTurn = true;
    this.gameFinished = false;
    this.gameOverMessage = '';
    this.board.reset();
  }

  resetBoards() {
    this.gameId = '';
    this.joinGameId = '';
    this.playerColor = null;
    this.isWhiteTurn = true;
    this.gameFinished = false;
    this.gameOverMessage = '';
    this.board.reset();
  }
} 