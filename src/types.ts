export type Category = 'Makanan' | 'Transportasi' | 'Hiburan' | 'Belanja' | 'Kesehatan' | 'Lainnya';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
}

export const CATEGORIES: Category[] = [
  'Makanan',
  'Transportasi',
  'Hiburan',
  'Belanja',
  'Kesehatan',
  'Lainnya'
];
