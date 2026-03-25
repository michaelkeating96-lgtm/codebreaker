import { useState, useEffect } from 'react';
import { socket } from './socket';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import RoleScreen from './screens/RoleScreen';
import SetCodeScreen from './screens/SetCodeScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import DisconnectScreen from './screens/DisconnectScreen';

const SCREENS = {
  HOME: 'HOME', LOBBY: 'LOBBY', ROLE: 'ROLE',
  SET_CODE: 'SET_CODE', GAME: 'GAME', RESULT: 'RESULT', DISCONNECT: 'DISCONNECT',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [canPickRole, setCanPickRole] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('room_created', ({ code }) => {
      setRoomCode(code);
      setScreen(SCREENS.LOBBY);
    });

    socket.on('room_joined', ({ players, eligiblePickerId }) => {
      setPlayers(players);
      // Only the designated player (creator on round 1, winner on rematch) sees role buttons
      setCanPickRole(eligiblePickerId === socket.id);
      setScreen(SCREENS.ROLE);
    });

    socket.on('join_error', ({ reason }) => {
      alert(`Could not join room: ${reason}`);
    });

    socket.on('roles_assigned', ({ players }) => {
      setPlayers(players);
      const me = players.find(p => p.id === socket.id);
      setMyRole(me?.role);
      setScreen(me?.role === 'setter' ? SCREENS.SET_CODE : SCREENS.GAME);
    });

    socket.on('guess_result', (guessRecord) => {
      setGuesses(prev => [...prev, guessRecord]);
    });

    socket.on('game_over', ({ winner, secretCode }) => {
      setGameResult({ winner, secretCode });
      setScreen(SCREENS.RESULT);
    });

    socket.on('rematch_ready', ({ eligiblePickerId }) => {
      setGuesses([]);
      setGameResult(null);
      setMyRole(null);
      setCanPickRole(eligiblePickerId === socket.id);
      setScreen(SCREENS.ROLE);
    });

    socket.on('rematch_declined', () => {
      // Triggered for the OTHER player when one player clicks "No Thanks"
      goHome();
    });

    socket.on('opponent_disconnected', () => {
      setScreen(SCREENS.DISCONNECT);
    });

    return () => {
      [
        'room_created', 'room_joined', 'join_error', 'roles_assigned',
        'guess_result', 'game_over', 'rematch_ready', 'rematch_declined',
        'opponent_disconnected',
      ].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, []);

  function goHome() {
    setScreen(SCREENS.HOME);
    setRoomCode('');
    setPlayers([]);
    setMyRole(null);
    setGuesses([]);
    setGameResult(null);
    setCanPickRole(false);
  }

  const screenProps = { roomCode, players, myRole, guesses, gameResult, goHome };

  return (
    <div className="app">
      {screen === SCREENS.HOME && <HomeScreen />}
      {screen === SCREENS.LOBBY && <LobbyScreen {...screenProps} />}
      {screen === SCREENS.ROLE && <RoleScreen {...screenProps} canPickRole={canPickRole} />}
      {screen === SCREENS.SET_CODE && <SetCodeScreen />}
      {screen === SCREENS.GAME && <GameScreen guesses={guesses} />}
      {screen === SCREENS.RESULT && <ResultScreen {...screenProps} />}
      {screen === SCREENS.DISCONNECT && <DisconnectScreen goHome={goHome} />}
    </div>
  );
}
