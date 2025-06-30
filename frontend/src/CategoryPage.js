import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:3001/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setMessage('Error fetching categories.');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/categories', { name: newCategoryName });
      setNewCategoryName('');
      fetchCategories();
      setMessage('Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      setMessage('Error adding category.');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setEditingCategoryName(category.name);
  };

  const handleUpdateCategory = async (id) => {
    try {
      await axios.put(`http://localhost:3001/categories/${id}`, { name: editingCategoryName });
      setEditingCategory(null);
      setEditingCategoryName('');
      fetchCategories();
      setMessage('Category updated successfully!');
    } catch (error) {
      console.error('Error updating category:', error);
      setMessage('Error updating category.');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/categories/${id}`);
      fetchCategories();
      setMessage('Category deleted successfully.');
    } catch (error) {
      console.error('Error deleting category:', error);
      setMessage('Error deleting category. Please ensure no ingredients are linked to this category.');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>食材類別管理</h1>
      {message && <p>{message}</p>}

      <form onSubmit={handleAddCategory} style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="新類別名稱"
          required
          style={{ marginRight: 8, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>新增類別</button>
      </form>

      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {categories.map((category) => (
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

export default CategoryPage; 