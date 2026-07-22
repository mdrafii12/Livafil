import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, Edit3, Trash2, X, Check, Loader2, Tags, Eye, Grid 
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';

const categorySchema = z.object({
  name: z.string().min(2, 'Category Name must be at least 2 characters'),
  description: z.string().optional(),
  color: z.string().min(1, 'Please select a color badge'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const PRESET_COLORS = [
  { name: 'Red', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50' },
  { name: 'Emerald', class: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' },
  { name: 'Blue', class: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50' },
  { name: 'Purple', class: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50' },
  { name: 'Amber', class: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50' },
  { name: 'Teal', class: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50' },
  { name: 'Indigo', class: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50' },
  { name: 'Rose', class: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50' }
];

export default function CategoriesPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedColorClass, setSelectedColorClass] = useState(PRESET_COLORS[0].class);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      setCategories(await db.getCategories());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCat(null);
    setSelectedColorClass(PRESET_COLORS[0].class);
    reset({
      name: '',
      description: '',
      color: PRESET_COLORS[0].class
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setSelectedColorClass(cat.color);
    setValue('name', cat.name);
    setValue('description', cat.description || '');
    setValue('color', cat.color);
    setFormOpen(true);
  };

  const onSubmitForm = async (data: CategoryFormValues) => {
    setIsLoading(true);
    try {
      if (!profile?.pharmacy_id) throw new Error('No pharmacy linked to this account.');
      if (editingCat) {
        await db.updateCategory(editingCat.id, data.name, data.description || '', data.color);
      } else {
        await db.addCategory(profile.pharmacy_id, data.name, data.description || '', data.color);
      }
      await refreshData();
      setFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the "${name}" category? Medicines in this category won't be deleted but their category links will be cleared.`)) {
      await db.deleteCategory(id);
      await refreshData();
    }
  };

  // Filter Categories
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalItems = filteredCategories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Therapeutic Categories</h1>
          <p className="text-sm text-gray-500">Group medicines by medical use and set distinct high-visibility color tags.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* FILTER SEARCH PANEL */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs">
        <div className="relative">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 h-full w-4" />
          <input 
            type="text" 
            placeholder="Search categories by keyword name or description..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* DATA LIST GRID */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="py-3.5 px-5">Category Name</th>
                <th className="py-3.5 px-5">Description</th>
                <th className="py-3.5 px-5">Color Label</th>
                <th className="py-3.5 px-5">Created Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
              {currentItems.length > 0 ? (
                currentItems.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <td className="py-4 px-5 font-bold text-gray-900 dark:text-white">{cat.name}</td>
                    <td className="py-4 px-5 text-gray-500 max-w-sm truncate">{cat.description || <span className="text-gray-300 italic">No description</span>}</td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex px-2.5 py-1 border rounded-full text-[10px] font-bold ${cat.color}`}>
                        {cat.name}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-gray-400 font-mono text-[11px]">
                      {new Date(cat.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-4 px-5 text-right space-x-1.5">
                      <button 
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                        title="Edit category settings"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <Tags className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No therapeutic categories registered</p>
                    <button onClick={handleOpenAdd} className="text-xs text-blue-600 hover:underline font-semibold mt-1">
                      Add a new classification now
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} classifications
            </span>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-100 dark:border-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600 dark:text-gray-300"
              >
                Prev
              </button>
              {[...Array(totalPages)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'border border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50'}`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-100 dark:border-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CATEGORIES MODAL DRAW-BOX */}
      {formOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideIn">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
                {editingCat ? 'Edit Classification' : 'Add New Classification'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category Label</label>
                <input 
                  type="text" 
                  {...register('name')}
                  placeholder="E.g. Cardiovascular"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs text-gray-900 dark:text-white"
                />
                {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Brief Description</label>
                <textarea 
                  rows={3}
                  {...register('description')}
                  placeholder="E.g. Medications used to support heart functions and treat blood pressures."
                  className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                ></textarea>
              </div>

              {/* Badges picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Color Label Picker</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((p) => {
                    const active = selectedColorClass === p.class;
                    return (
                      <button 
                        key={p.name}
                        type="button"
                        onClick={() => { setSelectedColorClass(p.class); setValue('color', p.class); }}
                        className={`py-1.5 text-[10px] font-bold border rounded-lg transition-colors ${p.class} ${active ? 'ring-2 ring-blue-500 scale-102 font-extrabold' : 'opacity-70 hover:opacity-100'}`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
                {/* Hidden color register input */}
                <input type="hidden" {...register('color')} />
              </div>

              {/* Dynamic Preview Box */}
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800/80 rounded-xl">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-2">Live Badge Preview</p>
                <div className="flex justify-center py-2">
                  <span className={`inline-flex px-3.5 py-1 rounded-full text-xs font-bold border ${selectedColorClass}`}>
                    Demo Classification Label
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingCat ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}