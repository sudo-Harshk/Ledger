import {
  collection,
  doc,
  setDoc,
  deleteDoc as fsDeleteDoc,
  getDocs,
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

export async function pullFromFirestore(): Promise<void> {
  if (!configured()) return;
  try {
    const [txSnap, catSnap, budSnap, emiSnap, setSnap, lendSnap] = await Promise.all([
      getDocs(collection(firestore, 'transactions')),
      getDocs(collection(firestore, 'categories')),
      getDocs(collection(firestore, 'budgets')),
      getDocs(collection(firestore, 'emis')),
      getDocs(collection(firestore, 'settings')),
      getDocs(collection(firestore, 'lends')),
    ]);

    const txs   = txSnap.docs.map(d => d.data()  as Transaction);
    const cats  = catSnap.docs.map(d => d.data()  as Category);
    const buds  = budSnap.docs.map(d => d.data()  as Budget);
    const emis  = emiSnap.docs.map(d => d.data()  as Emi);
    const sets  = setSnap.docs.map(d => d.data()  as Setting);
    const lends = lendSnap.docs.map(d => d.data() as Lend);

    await Promise.all([
      txs.length   > 0 ? db.transactions.bulkPut(txs)   : Promise.resolve(),
      cats.length  > 0 ? db.categories.bulkPut(cats)     : Promise.resolve(),
      buds.length  > 0 ? db.budgets.bulkPut(buds)        : Promise.resolve(),
      emis.length  > 0 ? db.emis.bulkPut(emis)           : Promise.resolve(),
      sets.length  > 0 ? db.settings.bulkPut(sets)       : Promise.resolve(),
      lends.length > 0 ? db.lends.bulkPut(lends)         : Promise.resolve(),
    ]);
  } catch {
    // offline or first load — fall back to local IndexedDB silently
  }
}
