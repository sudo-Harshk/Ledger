import {
  collection,
  doc,
  setDoc,
  deleteDoc as fsDeleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { db } from './schema';
import type { Transaction, Category, Budget, Emi, Setting, Lend } from './schema';
import { PUBLIC_FIREBASE_PROJECT_ID } from '$env/static/public';

type CollectionName = 'transactions' | 'categories' | 'budgets' | 'emis' | 'settings' | 'lends';

function configured() {
  return !!PUBLIC_FIREBASE_PROJECT_ID;
}

export async function pushDoc(col: CollectionName, data: object) {
  if (!configured()) return;
  const d = data as Record<string, unknown>;
  const id = String((d.id ?? d.key) ?? '');
  if (!id) return;
  try {
    await setDoc(doc(firestore, col, id), d, { merge: true });
  } catch {
    // silent — IndexedDB already has the data
  }
}

export async function removeDoc(col: CollectionName, id: string) {
  if (!configured()) return;
  try {
    await fsDeleteDoc(doc(firestore, col, id));
  } catch {
    // silent
  }
}

export async function clearFirestoreCollection(col: CollectionName): Promise<void> {
  if (!configured()) return;
  try {
    const snap = await getDocs(collection(firestore, col));
    await Promise.all(snap.docs.map(d => fsDeleteDoc(d.ref)));
  } catch {
    // silent
  }
}

export function subscribeToFirestore(onUpdate: () => void): () => void {
  if (!configured()) return () => {};

  function watch<T>(col: CollectionName, table: { bulkPut: (rows: T[]) => Promise<any>; bulkDelete: (ids: string[]) => Promise<any> }) {
    return onSnapshot(collection(firestore, col), snap => {
      const toUpsert = snap.docChanges()
        .filter(c => c.type !== 'removed')
        .map(c => c.doc.data() as T);
      const toDelete = snap.docChanges()
        .filter(c => c.type === 'removed')
        .map(c => c.doc.id);
      Promise.all([
        toUpsert.length > 0 ? table.bulkPut(toUpsert) : Promise.resolve(),
        toDelete.length > 0 ? table.bulkDelete(toDelete) : Promise.resolve(),
      ]).then(onUpdate).catch(() => {});
    }, () => {}); // silent error handler (offline / permission)
  }

  const unsubs = [
    watch<Transaction>('transactions', db.transactions),
    watch<Category>('categories',     db.categories),
    watch<Budget>('budgets',          db.budgets),
    watch<Emi>('emis',                db.emis),
    watch<Setting>('settings',        db.settings),
    watch<Lend>('lends',              db.lends),
  ];

  return () => unsubs.forEach(u => u());
}
