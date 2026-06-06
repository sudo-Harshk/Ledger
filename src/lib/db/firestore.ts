import {
  collection,
  doc,
  setDoc,
  deleteDoc as fsDeleteDoc,
  getDocs,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { db } from './schema';
import type { Transaction, Category, Budget, Emi, Setting } from './schema';
import { PUBLIC_FIREBASE_PROJECT_ID } from '$env/static/public';

type CollectionName = 'transactions' | 'categories' | 'budgets' | 'emis' | 'settings';

function configured() {
  return !!PUBLIC_FIREBASE_PROJECT_ID;
}

export async function pushDoc(col: CollectionName, data: Record<string, unknown>) {
  if (!configured()) return;
  const id = String((data.id ?? data.key) ?? '');
  if (!id) return;
  try {
    await setDoc(doc(firestore, col, id), data, { merge: true });
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

export async function pullFromFirestore(): Promise<void> {
  if (!configured()) return;
  try {
    const [txSnap, catSnap, budSnap, emiSnap, setSnap] = await Promise.all([
      getDocs(collection(firestore, 'transactions')),
      getDocs(collection(firestore, 'categories')),
      getDocs(collection(firestore, 'budgets')),
      getDocs(collection(firestore, 'emis')),
      getDocs(collection(firestore, 'settings')),
    ]);

    const txs  = txSnap.docs.map(d => d.data()  as Transaction);
    const cats = catSnap.docs.map(d => d.data()  as Category);
    const buds = budSnap.docs.map(d => d.data()  as Budget);
    const emis = emiSnap.docs.map(d => d.data()  as Emi);
    const sets = setSnap.docs.map(d => d.data()  as Setting);

    await Promise.all([
      txs.length  > 0 ? db.transactions.bulkPut(txs)  : Promise.resolve(),
      cats.length > 0 ? db.categories.bulkPut(cats)    : Promise.resolve(),
      buds.length > 0 ? db.budgets.bulkPut(buds)       : Promise.resolve(),
      emis.length > 0 ? db.emis.bulkPut(emis)          : Promise.resolve(),
      sets.length > 0 ? db.settings.bulkPut(sets)      : Promise.resolve(),
    ]);
  } catch {
    // offline or first load — fall back to local IndexedDB silently
  }
}
