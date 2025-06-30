import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecipeCategoryPage = () => {
  const [recipeCategories, setRecipeCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRecipeCategories();
  }, []);

  const fetchRecipeCategories = async () => {
    try {
      const response = await axios.get('http://localhost:3001/recipe-categories');
      setRecipeCategories(response.data);
    } catch (error) {
      console.error('Error fetching recipe categories:', error);
      setMessage('Error fetching recipe categories.');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/recipe-categories', { name: newCategoryName });
      setNewCategoryName('');
      fetchRecipeCategories();
      setMessage('Recipe category added successfully!');
    } catch (error) {
      console.error('Error adding recipe category:', error);
      setMessage('Error adding recipe category.');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setEditingCategoryName(category.name);
  };

  const handleUpdateCategory = async (id) => {
    try {
      await axios.put(`http://localhost:3001/recipe-categories/${id}`, { name: editingCategoryName });
      setEditingCategory(null);
      setEditingCategoryName('');
      fetchRecipeCategories();
      setMessage('Recipe category updated successfully!');
    } catch (error) {
      console.error('Error updating recipe category:', error);
      setMessage('Error updating recipe category.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('確定要刪除這個料理類別嗎？')) return;
    try {
      await axios.delete(`http://localhost:3001/recipe-categories/${id}`);
      fetchRecipeCategories();
      setMessage('Recipe category deleted successfully.');
    } catch (error) {
      console.error('Error deleting recipe category:', error);
      setMessage('Error deleting recipe category. Please ensure no recipes are linked to this category.');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>料理類別管理</h1>
      {message && <p>{message}</p>}

      <form onSubmit={handleAddCategory} style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="新料理類別名稱"
          required
          style={{ marginRight: 8, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>新增類別</button>
      </form>

      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {recipeCategories.map((category) => (
          <li key={category.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            {editingCategory === category.id ? (
              <>
                <input
                  type="text"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  style={{ marginRight: 8, padding: 8, border: '1px solid #ccc', borderRadius: 4, flexGrow: 1 }}
                />
                <button onClick={() => handleUpdateCategory(category.id)} style={{ padding: '8px 12px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 4 }}>儲存</button>
                <button onClick={() => setEditingCategory(null)} style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>取消</button>
              </>
            ) : (
              <>
                <span style={{ flexGrow: 1 }}>{category.name}</span>
                <button onClick={() => handleEditCategory(category)} style={{ padding: '8px 12px', backgroundColor: '#ffc107', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 4 }}>編輯</button>
                <button onClick={() => handleDeleteCategory(category.id)} style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>刪除</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecipeCategoryPage; 