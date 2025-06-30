import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'; // 可以保留或根據需要調整樣式

function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]); // 新增類別狀態
  const [form, setForm] = useState({ name: '', unit: '', stock: '', expiry_date: '', category_id: '' }); // 修改為 category_id
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ unit: '', stock: '', expiry_date: '', category_id: '' }); // 修改為 category_id

  // 將 loadData 函式定義移到元件頂層，使其可被多處調用
  const loadData = async () => {
    setLoading(true);
    try {
      const [ingredientsRes, categoriesRes] = await Promise.all([
        axios.get('http://localhost:3001/ingredients'),
        axios.get('http://localhost:3001/categories')
      ]);

      const fetchedIngredients = ingredientsRes.data;
      const fetchedCategories = categoriesRes.data;

      setCategories(fetchedCategories); // 更新 categories 狀態

      // 依庫存 (0的放最下)、類別名稱、到期日排序
      const sortedIngredients = fetchedIngredients.sort((a, b) => {
        // 1. 庫存是0的一律放最下面
        if (a.stock === 0 && b.stock !== 0) return 1; 
        if (a.stock !== 0 && b.stock === 0) return -1;

        // 如果兩者庫存狀態相同 (都為0或都非0)，則繼續下一個排序條件
        const categoryA = fetchedCategories.find(cat => cat.id === a.category_id)?.name || '無類別';
        const categoryB = fetchedCategories.find(cat => cat.id === b.category_id)?.name || '無類別';

        // 2. 依類別名稱排序
        const categoryCompare = categoryA.localeCompare(categoryB);
        if (categoryCompare !== 0) {
          return categoryCompare;
        }

        // 如果類別相同，則進行到期日排序
        const dateA = a.expiry_date ? new Date(a.expiry_date) : null;
        const dateB = b.expiry_date ? new Date(b.expiry_date) : null;

        // 3. 依到期日排序 (時間越早的越前面)
        if (dateA && dateB) {
            const dateCompare = dateA.getTime() - dateB.getTime();
            if (dateCompare !== 0) {
                return dateCompare;
            }
        } else if (dateA) { 
            return -1; 
        } else if (dateB) { 
            return 1; 
        }

        return 0; // Everything is the same, maintain original order
      });
      setIngredients(sortedIngredients);
      setError('');
    } catch (err) {
      console.error('Error fetching data for IngredientsPage:', err);
      setError('無法取得食材資料或類別資料');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 處理表單輸入 (新增)
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
        expiry_date: form.expiry_date,
        category_id: form.category_id === '' ? null : Number(form.category_id) // 將空字串轉為 null，並確保為數字
      });
      setForm({ name: '', unit: '', stock: '', expiry_date: '', category_id: '' });
      // 重新載入所有資料以確保排序正確
      loadData(); // <-- Calling loadData after a successful submission
    } catch (err) {
      setError(`新增失敗: ${err.response?.data?.error || err.message}`);
    }
  };

  // 刪除食材
  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這個食材嗎？')) return;
    try {
      await axios.delete(`http://localhost:3001/ingredients/${id}`);
      // 重新載入所有資料以確保排序正確
      loadData(); // <-- Calling loadData after a successful deletion
    } catch (err) {
      setError('刪除失敗');
    }
  };

  // 進入編輯模式
  const handleEdit = (ing) => {
    setEditId(ing.id);
    setEditForm({
      unit: ing.unit,
      stock: ing.stock,
      expiry_date: ing.expiry_date ? ing.expiry_date.slice(0, 10) : '',
      category_id: ing.category_id || '' // 設定編輯時的類別 ID
    });
  };

  // 處理編輯表單輸入
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // 儲存編輯
  const handleEditSave = async (id) => {
    try {
      const { unit, stock, expiry_date, category_id } = editForm; // 取得 category_id
      await axios.put(`http://localhost:3001/ingredients/${id}`, {
        unit: unit,
        stock: Number(stock) || 0,
        expiry_date: expiry_date,
        category_id: category_id === '' ? null : Number(category_id) // 將空字串轉為 null，並確保為數字
      });
      setEditId(null);
      // 重新載入所有資料以確保排序正確
      loadData(); // <-- Calling loadData after a successful edit
      setError('');
    } catch (err) {
      setError(`更新失敗: ${err.response?.data?.error || err.message}`);
    }
  };

  // 取消編輯
  const handleEditCancel = () => {
    setEditId(null);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>食材庫存管理</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="name">名稱</label><br />
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="食材名稱"
              required
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="unit">單位</label><br />
            <input
              id="unit"
              name="unit"
              value={form.unit}
              onChange={handleChange}
              placeholder="單位 (如顆/把/包)"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="stock">庫存數量</label><br />
            <input
              id="stock"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              placeholder="庫存數量"
              type="number"
              min="0"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="expiry_date">到期日</label><br />
            <input
              id="expiry_date"
              name="expiry_date"
              value={form.expiry_date}
              onChange={handleChange}
              placeholder="到期日 (YYYY-MM-DD)"
              type="date"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="category_id">類別</label><br />
            <select
              id="category_id"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            >
              <option value="">--請選擇類別--</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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
              <th>類別</th>
              <th>名稱</th>
              <th>單位</th>
              <th>庫存</th>
              <th>到期日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => {
              const categoryName = categories.find(cat => cat.id === ing.category_id)?.name || '無類別';
              const expiryDate = ing.expiry_date ? new Date(ing.expiry_date) : null;
              const today = new Date();
              const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

              let rowBackgroundColor = 'transparent';
              if (expiryDate) {
                if (expiryDate < today) {
                  rowBackgroundColor = '#ffe0e0'; // 過期 (紅色)
                } else if (expiryDate < sevenDaysFromNow) {
                  rowBackgroundColor = '#fff5e0'; // 即將過期 (黃色)
                }
              }

              return (
                <tr key={ing.id} style={{ backgroundColor: rowBackgroundColor }}>
                  <td>
                    {editId === ing.id ? (
                      <select
                        name="category_id"
                        value={editForm.category_id}
                        onChange={handleEditChange}
                        style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                      >
                        <option value="">--請選擇類別--</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      categoryName
                    )}
                  </td>
                  <td>
                    {ing.name}
                  </td>
                  <td>
                    {editId === ing.id ? (
                      <input
                        type="text"
                        name="unit"
                        value={editForm.unit}
                        onChange={handleEditChange}
                        placeholder="單位 (如顆/把/包)"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      ing.unit
                    )}
                  </td>
                  <td>
                    {editId === ing.id ? (
                      <input
                        type="number"
                        name="stock"
                        value={editForm.stock}
                        onChange={handleEditChange}
                        min="0"
                        placeholder="庫存數量"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      ing.stock
                    )}
                  </td>
                  <td>
                    {editId === ing.id ? (
                      <input
                        type="date"
                        name="expiry_date"
                        value={editForm.expiry_date}
                        onChange={handleEditChange}
                        placeholder="到期日 (YYYY-MM-DD)"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      ing.expiry_date ? new Date(ing.expiry_date).toLocaleDateString() : '無'
                    )}
                  </td>
                  <td>
                    {editId === ing.id ? (
                      <>
                        <button onClick={() => handleEditSave(ing.id)} style={{ marginRight: 8 }}>儲存</button>
                        <button onClick={handleEditCancel}>取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(ing)} style={{ marginRight: 8 }}>編輯</button>
                        <button onClick={() => handleDelete(ing.id)}>刪除</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>目前沒有食材，請新增。</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default IngredientsPage; 