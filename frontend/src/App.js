import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import RecipePage from './RecipePage';
import WeeklyPlanPage from './WeeklyPlanPage';
import ShoppingListPage from './ShoppingListPage';
import IngredientsPage from './IngredientsPage';
import CategoryPage from './CategoryPage';
import RecipeCategoryPage from './RecipeCategoryPage';
import DashboardPage from './DashboardPage';
import OrderPage from './OrderPage';

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState({ name: '', unit: '', stock: '', expiry_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', unit: '', stock: '', expiry_date: '' });
  const [page, setPage] = useState('ingredients');
  const [ingredientsRefreshKey, setIngredientsRefreshKey] = useState(0);

  // 取得食材列表
  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/ingredients');
      setIngredients(res.data);
      setError('');
    } catch (err) {
      setError('無法取得食材資料');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  // 處理表單輸入
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 新增食材
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      await axios.post('http://localhost:3001/ingredients', {
        name: form.name,
        unit: form.unit,
        stock: Number(form.stock) || 0,
        expiry_date: form.expiry_date
      });
      setForm({ name: '', unit: '', stock: '', expiry_date: '' });
      fetchIngredients();
    } catch (err) {
      setError('新增失敗');
    }
  };

  // 刪除食材
  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這個食材嗎？')) return;
    try {
      await axios.delete(`http://localhost:3001/ingredients/${id}`);
      fetchIngredients();
    } catch (err) {
      setError('刪除失敗');
    }
  };

  // 進入編輯模式
  const handleEdit = (ing) => {
    setEditId(ing.id);
    setEditForm({
      name: ing.name,
      unit: ing.unit,
      stock: ing.stock,
      expiry_date: ing.expiry_date ? ing.expiry_date.slice(0, 10) : ''
    });
  };

  // 處理編輯表單輸入
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // 儲存編輯
  const handleEditSave = async (id) => {
    try {
      await axios.put(`http://localhost:3001/ingredients/${id}`, {
        ...editForm,
        stock: Number(editForm.stock) || 0
      });
      setEditId(null);
      fetchIngredients();
    } catch (err) {
      setError('更新失敗');
    }
  };

  // 取消編輯
  const handleEditCancel = () => {
    setEditId(null);
  };

  const handleInventoryUpdate = () => {
    setIngredientsRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="App" style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setPage('ingredients')} style={{ marginRight: 8, fontWeight: page === 'ingredients' ? 'bold' : 'normal' }}>食材庫存管理</button>
        <button onClick={() => setPage('recipes')} style={{ marginRight: 8, fontWeight: page === 'recipes' ? 'bold' : 'normal' }}>料理管理</button>
        <button onClick={() => setPage('weeklyplan')} style={{ marginRight: 8, fontWeight: page === 'weeklyplan' ? 'bold' : 'normal' }}>一週菜單</button>
        <button onClick={() => setPage('categories')} style={{ marginRight: 8, fontWeight: page === 'categories' ? 'bold' : 'normal' }}>食材類別</button>
        <button onClick={() => setPage('recipeCategories')} style={{ marginRight: 8, fontWeight: page === 'recipeCategories' ? 'bold' : 'normal' }}>料理類別</button>
        <button onClick={() => setPage('shoppinglist')} style={{ fontWeight: page === 'shoppinglist' ? 'bold' : 'normal' }}>採買清單</button>
        <button onClick={() => setPage('dashboard')} style={{ marginRight: 8, fontWeight: page === 'dashboard' ? 'bold' : 'normal' }}>儀表板</button>
        <button onClick={() => setPage('order')} style={{ marginRight: 8, fontWeight: page === 'order' ? 'bold' : 'normal' }}>點餐</button>
      </div>
      {page === 'ingredients' ? (
        <IngredientsPage key={ingredientsRefreshKey} />
      ) : page === 'recipes' ? (
        <RecipePage />
      ) : page === 'weeklyplan' ? (
        <WeeklyPlanPage />
      ) : page === 'categories' ? (
        <CategoryPage />
      ) : page === 'recipeCategories' ? (
        <RecipeCategoryPage />
      ) : page === 'dashboard' ? (
        <DashboardPage />
      ) : page === 'order' ? (
        <OrderPage onInventoryUpdate={handleInventoryUpdate} />
      ) : (
        <ShoppingListPage onInventoryUpdate={handleInventoryUpdate} />
      )}
    </div>
  );
}

export default App;
