import React, { useEffect, useState } from 'react';
import axios from 'axios';

function RecipePage() {
  const [recipes, setRecipes] = useState([]);
  const [recipeCategories, setRecipeCategories] = useState([]);
  const [form, setForm] = useState({ name: '', meal_type: '', description: '', recipe_category_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', meal_type: '', description: '', recipe_category_id: '' });
  const [showFormulaId, setShowFormulaId] = useState(null);
  const [formula, setFormula] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [newFormula, setNewFormula] = useState({ ingredient_id: '', quantity: '' });
  const [selectedCategory, setSelectedCategory] = useState('');

  // 取得料理列表
  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/recipes');
      setRecipes(res.data);
      setError('');
    } catch (err) {
      setError('無法取得料理資料');
    }
    setLoading(false);
  };

  // 取得料理類別列表
  const fetchRecipeCategories = async () => {
    try {
      const res = await axios.get('http://localhost:3001/recipe-categories');
      setRecipeCategories(res.data);
    } catch (err) {
      console.error('Error fetching recipe categories:', err);
      setError('無法取得料理類別資料');
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchRecipeCategories();
  }, []);

  // 取得所有食材
  const fetchAllIngredients = async () => {
    try {
      const res = await axios.get('http://localhost:3001/ingredients');
      setAllIngredients(res.data);
    } catch {}
  };

  // 取得某料理配方
  const fetchFormula = async (recipeId) => {
    try {
      const res = await axios.get(`http://localhost:3001/recipes/${recipeId}/ingredients`);
      setFormula(res.data);
    } catch {}
  };

  // 處理表單輸入
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 新增料理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      await axios.post('http://localhost:3001/recipes', {
        name: form.name,
        meal_type: form.meal_type,
        description: form.description,
        recipe_category_id: form.recipe_category_id === '' ? null : Number(form.recipe_category_id)
      });
      setForm({ name: '', meal_type: '', description: '', recipe_category_id: '' });
      fetchRecipes();
    } catch (err) {
      setError(`新增失敗: ${err.response?.data?.error || err.message}`);
    }
  };

  // 刪除料理
  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這道料理嗎？')) return;
    try {
      await axios.delete(`http://localhost:3001/recipes/${id}`);
      fetchRecipes();
    } catch (err) {
      setError('刪除失敗');
    }
  };

  // 進入編輯模式
  const handleEdit = (rec) => {
    setEditId(rec.id);
    setEditForm({
      name: rec.name,
      meal_type: rec.meal_type,
      description: rec.description || '',
      recipe_category_id: rec.recipe_category_id || ''
    });
  };

  // 處理編輯表單輸入
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // 儲存編輯
  const handleEditSave = async (id) => {
    try {
      await axios.put(`http://localhost:3001/recipes/${id}`, {
        name: editForm.name,
        meal_type: editForm.meal_type,
        description: editForm.description,
        recipe_category_id: editForm.recipe_category_id === '' ? null : Number(editForm.recipe_category_id)
      });
      setEditId(null);
      fetchRecipes();
      setError('');
    } catch (err) {
      setError(`更新失敗: ${err.response?.data?.error || err.message}`);
    }
  };

  // 取消編輯
  const handleEditCancel = () => {
    setEditId(null);
  };

  // 顯示配方設定
  const handleShowFormula = (recipeId) => {
    setShowFormulaId(recipeId);
    setNewFormula({ ingredient_id: '', quantity: '' });
    fetchFormula(recipeId);
    fetchAllIngredients();
  };

  // 新增配方食材
  const handleAddFormula = async (e) => {
    e.preventDefault();
    if (!newFormula.ingredient_id || !newFormula.quantity) return;
    await axios.post(`http://localhost:3001/recipes/${showFormulaId}/ingredients`, newFormula);
    setNewFormula({ ingredient_id: '', quantity: '' });
    fetchFormula(showFormulaId);
  };

  // 刪除配方食材
  const handleDeleteFormula = async (id) => {
    await axios.delete(`http://localhost:3001/recipe_ingredients/${id}`);
    fetchFormula(showFormulaId);
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 20 }}>
      <h1>料理管理</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="name">料理名稱</label><br />
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="料理名稱"
              required
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="meal_type">餐別</label><br />
            <select
              id="meal_type"
              name="meal_type"
              value={form.meal_type}
              onChange={handleChange}
              style={{ width: '100%' }}
              required
            >
              <option value="">請選擇</option>
              <option value="breakfast">早餐</option>
              <option value="lunch">午餐</option>
              <option value="dinner">晚餐</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="recipe_category_id">料理類別</label><br />
            <select
              id="recipe_category_id"
              name="recipe_category_id"
              value={form.recipe_category_id}
              onChange={handleChange}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            >
              <option value="">--請選擇類別--</option>
              {recipeCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label htmlFor="description">備註</label><br />
            <input
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="備註"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <button type="submit">新增</button>
      </form>
      {loading ? (
        <div>載入中...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>名稱</th>
              <th>餐別</th>
              <th>料理類別</th>
              <th>備註</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((rec) => {
              const recipeCategoryName = recipeCategories.find(cat => cat.id === rec.recipe_category_id)?.name || '無類別';
              return (
                <React.Fragment key={rec.id}>
                  <tr>
                    {editId === rec.id ? (
                      <>
                        <td><input name="name" value={editForm.name} onChange={handleEditChange} /></td>
                        <td>
                          <select name="meal_type" value={editForm.meal_type} onChange={handleEditChange}>
                            <option value="breakfast">早餐</option>
                            <option value="lunch">午餐</option>
                            <option value="dinner">晚餐</option>
                          </select>
                        </td>
                        <td>
                          <select
                            name="recipe_category_id"
                            value={editForm.recipe_category_id}
                            onChange={handleEditChange}
                            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                          >
                            <option value="">--請選擇類別--</option>
                            {recipeCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td><input name="description" value={editForm.description} onChange={handleEditChange} /></td>
                        <td>
                          <button onClick={() => handleEditSave(rec.id)}>儲存</button>
                          <button onClick={handleEditCancel} style={{ marginLeft: 8 }}>取消</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{rec.name}</td>
                        <td>{rec.meal_type === 'breakfast' ? '早餐' : rec.meal_type === 'lunch' ? '午餐' : '晚餐'}</td>
                        <td>{recipeCategoryName}</td>
                        <td>{rec.description}</td>
                        <td>
                          <button onClick={() => handleEdit(rec)}>編輯</button>
                          <button onClick={() => handleDelete(rec.id)} style={{ marginLeft: 8, color: 'red' }}>刪除</button>
                          <button onClick={() => handleShowFormula(rec.id)} style={{ marginLeft: 8 }}>設定配方</button>
                        </td>
                      </>
                    )}
                  </tr>
                  {showFormulaId === rec.id && (
                    <tr>
                      <td colSpan="5">
                        <div style={{ background: '#f8f8f8', padding: 12, margin: 8, border: '1px solid #ccc' }}>
                          <b>配方設定</b>
                          <div style={{ marginBottom: 8 }}>
                            <label htmlFor="categoryFilter">篩選食材類別：</label>
                            <select id="categoryFilter" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                              <option value="">所有類別</option>
                              {Array.from(new Set(allIngredients.map(ing => ing.category_name))).filter(Boolean).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <form onSubmit={handleAddFormula} style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                            <select name="ingredient_id" value={newFormula.ingredient_id} onChange={e => setNewFormula({ ...newFormula, ingredient_id: e.target.value })} required>
                              <option value="">選擇食材</option>
                              {allIngredients.filter(ing => !selectedCategory || ing.category_name === selectedCategory).map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name}（{ing.unit}）</option>
                              ))}
                            </select>
                            <input name="quantity" type="number" min="1" value={newFormula.quantity} onChange={e => setNewFormula({ ...newFormula, quantity: e.target.value })} placeholder="數量" required style={{ width: 80 }} />
                            <button type="submit">新增</button>
                          </form>
                          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                            <thead>
                              <tr>
                                <th>食材名稱</th>
                                <th>數量</th>
                                <th>操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formula.length > 0 ? (
                                formula.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.name} ({item.unit})</td>
                                    <td>{item.quantity}</td>
                                    <td><button onClick={() => handleDeleteFormula(item.id)} style={{ color: 'red' }}>刪除</button></td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="3">無配方食材</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RecipePage; 