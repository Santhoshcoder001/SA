import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { KidsLayout } from './layouts/KidsLayout';
import { LandingPage } from './pages/LandingPage';
import { SubjectSelect } from './pages/SubjectSelect';
import { AdminPanel } from './pages/AdminPanel';
import { ImportWords } from './pages/ImportWords';

// Activity views
import { Alphabet } from './pages/activities/Alphabet';
import { WordLearning } from './pages/activities/WordLearning';
import { LetterArrangement } from './pages/activities/LetterArrangement';
import { MissingLetter } from './pages/activities/MissingLetter';
import { PictureId } from './pages/activities/PictureId';
import { Listening } from './pages/activities/Listening';
import { FlashCards } from './pages/activities/FlashCards';
import { MatchingGame } from './pages/activities/MatchingGame';
import { MemoryGame } from './pages/activities/MemoryGame';
import { Quiz } from './pages/activities/Quiz';

import { useGameStore } from './hooks/useGameStore';

function App() {
  const initializeSystem = useGameStore(state => state.initializeSystem);

  // Initialize database and load static configurations on app mount
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Main interactive kids views inside KidsLayout */}
        <Route element={<KidsLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/subjects" element={<SubjectSelect />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/import" element={<ImportWords />} />

          {/* Educational activities */}
          <Route path="/subject/alphabet" element={<Alphabet />} />
          <Route path="/subject/words" element={<WordLearning />} />
          <Route path="/subject/letter-arrangement" element={<LetterArrangement />} />
          <Route path="/subject/missing-letter" element={<MissingLetter />} />
          <Route path="/subject/picture-id" element={<PictureId />} />
          <Route path="/subject/listening" element={<Listening />} />
          <Route path="/subject/flashcards" element={<FlashCards />} />
          <Route path="/subject/matching" element={<MatchingGame />} />
          <Route path="/subject/memory" element={<MemoryGame />} />
          <Route path="/subject/quiz" element={<Quiz />} />

          {/* Catch-all redirection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
