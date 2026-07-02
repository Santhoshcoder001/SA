import type { Language, Subject, LearningItem, QuizQuestion } from '../types';

const DB_NAME = 'kids-learning-platform-db';
const DB_VERSION = 2; // Bumped to v2: English & Tamil only, 100 words each

export class AppDb {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;

        // On any version upgrade, we delete and recreate stores to ensure clean state.
        // This allows the app to re-seed with the new expanded word lists.
        if (oldVersion < 2) {
          // Delete old stores if they exist
          if (db.objectStoreNames.contains('languages')) db.deleteObjectStore('languages');
          if (db.objectStoreNames.contains('subjects')) db.deleteObjectStore('subjects');
          if (db.objectStoreNames.contains('learning_items')) db.deleteObjectStore('learning_items');
          if (db.objectStoreNames.contains('quiz_questions')) db.deleteObjectStore('quiz_questions');
        }

        // Languages Store
        if (!db.objectStoreNames.contains('languages')) {
          db.createObjectStore('languages', { keyPath: 'id' });
        }

        // Subjects Store
        if (!db.objectStoreNames.contains('subjects')) {
          db.createObjectStore('subjects', { keyPath: 'id' });
        }

        // Learning Items Store
        if (!db.objectStoreNames.contains('learning_items')) {
          const itemStore = db.createObjectStore('learning_items', { keyPath: 'id' });
          itemStore.createIndex('language', 'language', { unique: false });
          itemStore.createIndex('subject', 'subject', { unique: false });
          itemStore.createIndex('lang_subj', ['language', 'subject'], { unique: false });
        }

        // Quiz Questions Store
        if (!db.objectStoreNames.contains('quiz_questions')) {
          const quizStore = db.createObjectStore('quiz_questions', { keyPath: 'id' });
          quizStore.createIndex('language', 'language', { unique: false });
        }
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- LANGUAGES ---
  async getLanguages(): Promise<Language[]> {
    const store = await this.getStore('languages');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLanguage(lang: Language): Promise<void> {
    const store = await this.getStore('languages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(lang);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLanguage(id: string): Promise<void> {
    const store = await this.getStore('languages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- SUBJECTS ---
  async getSubjects(): Promise<Subject[]> {
    const store = await this.getStore('subjects');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = request.result.sort((a, b) => a.order - b.order);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSubject(subject: Subject): Promise<void> {
    const store = await this.getStore('subjects', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(subject);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSubject(id: string): Promise<void> {
    const store = await this.getStore('subjects', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- LEARNING ITEMS ---
  async getLearningItems(langId?: string, subjectId?: string): Promise<LearningItem[]> {
    const store = await this.getStore('learning_items');
    return new Promise((resolve, reject) => {
      if (langId && subjectId) {
        const index = store.index('lang_subj');
        const query = index.getAll(IDBKeyRange.only([langId, subjectId]));
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      } else if (langId) {
        const index = store.index('language');
        const query = index.getAll(IDBKeyRange.only(langId));
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      } else if (subjectId) {
        const index = store.index('subject');
        const query = index.getAll(IDBKeyRange.only(subjectId));
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async saveLearningItem(item: LearningItem): Promise<void> {
    const store = await this.getStore('learning_items', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async bulkSaveLearningItems(items: LearningItem[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('learning_items', 'readwrite');
      const store = transaction.objectStore('learning_items');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      items.forEach(item => {
        store.put(item);
      });
    });
  }

  async deleteLearningItem(id: string): Promise<void> {
    const store = await this.getStore('learning_items', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async bulkDeleteLearningItems(ids: string[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('learning_items', 'readwrite');
      const store = transaction.objectStore('learning_items');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      ids.forEach(id => {
        store.delete(id);
      });
    });
  }

  // --- QUIZ QUESTIONS ---
  async getQuizQuestions(langId?: string): Promise<QuizQuestion[]> {
    const store = await this.getStore('quiz_questions');
    return new Promise((resolve, reject) => {
      if (langId) {
        const index = store.index('language');
        const query = index.getAll(IDBKeyRange.only(langId));
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async bulkSaveQuizQuestions(questions: QuizQuestion[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('quiz_questions', 'readwrite');
      const store = transaction.objectStore('quiz_questions');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      questions.forEach(q => {
        store.put(q);
      });
    });
  }

  async deleteQuizQuestion(id: string): Promise<void> {
    const store = await this.getStore('quiz_questions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Returns the total count of learning items for a given language (or all if no langId). */
  async getWordCount(langId?: string): Promise<number> {
    const store = await this.getStore('learning_items');
    return new Promise((resolve, reject) => {
      if (langId) {
        const index = store.index('language');
        const request = index.count(IDBKeyRange.only(langId));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  /** Deletes all learning items for a given language (for Replace mode import). */
  async clearLearningItemsByLanguage(langId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('learning_items', 'readwrite');
      const store = transaction.objectStore('learning_items');
      const index = store.index('language');
      const request = index.openCursor(IDBKeyRange.only(langId));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  }
}

export const dbService = new AppDb();
