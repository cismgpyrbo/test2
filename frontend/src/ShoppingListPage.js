import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ShoppingListPage({ onInventoryUpdate }) {
  const [weekStart, setWeekStart] = useState(() => {
    // 預設本週一
    const now = new Date();
    const day = now.getDay() || 7;
    now.setDate(now.getDate() - day + 1);
    return now.toISOString().slice(0, 10);
  });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState({});
  const [manualItem, setManualItem] = useState({ name: '', to_buy: '', unit: '', expiry_date: '' });
  const [manualList, setManualList] = useState([]);
  const [editManualId, setEditManualId] = useState(null);
  const [editManualItem, setEditManualItem] = useState({ name: '', to_buy: '', unit: '', expiry_date: '' });
  const [editAutoId, setEditAutoId] = useState(null);
  const [editAutoItem, setEditAutoItem] = useState({ to_buy: '', unit: '', expiry_date: '', category: '' });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/generate-shopping-list', { week_start_date: weekStart });
      setList(res.data);
      setError('');
    } catch (err) {
      setError('無法取得採買清單');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [weekStart]);

  const handleCheck = (id) => {
    setChecked(c => ({ ...c, [id]: !c[id] }));
  };

  const handleConfirmPurchase = async () => {
    if (!window.confirm('確定要將勾選的食材新增到庫存嗎？')) return;

    const purchasedItems = [];
    
    // 從自動產生的清單中找出已勾選且需採買的項目
    list.forEach(item => {
      if (checked[item.ingredient_id] && item.to_buy > 0) {
        purchasedItems.push({
          ingredient_id: item.ingredient_id,
          name: item.name,
          unit: item.unit,
          quantity: item.to_buy,
          expiry_date: item.expiry_date
        });
      }
    });

    // 從手動新增的清單中找出已勾選的項目
    manualList.forEach(item => {
      if (checked[item.ingredient_id]) {
        purchasedItems.push({
          name: item.name,
          unit: item.unit,
          quantity: Number(item.to_buy),
          expiry_date: item.expiry_date
        });
      }
    });

    if (purchasedItems.length === 0) {
      alert('沒有勾選的食材需要更新庫存。');
      return;
    }

    try {
      setLoading(true);
      await axios.post('http://localhost:3001/ingredients/confirm-purchase', purchasedItems);
      alert('庫存已更新！');
      fetchList(); // 重新載入採買清單
      setChecked({}); // 清空勾選狀態
      setManualList([]); // 清空手動新增列表，因為它們已經被處理
      if (onInventoryUpdate) {
        onInventoryUpdate(); // 通知 App.js 刷新食材頁面
      }
    } catch (err) {
      setError('更新庫存失敗！');
      console.error(err);
    }
    setLoading(false);
  };

  const handleManualChange = (e) => {
    setManualItem({ ...manualItem, [e.target.name]: e.target.value });
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualItem.name || !manualItem.to_buy || !manualItem.unit || !manualItem.expiry_date) return;
    setManualList(list => [...list, { ...manualItem, ingredient_id: 'manual_' + (manualList.length + 1) }]);
    setManualItem({ name: '', to_buy: '', unit: '', expiry_date: '' });
  };

  const handleManualEdit = (item) => {
    setEditManualId(item.ingredient_id);
    setEditManualItem({ name: item.name, to_buy: item.to_buy, unit: item.unit, expiry_date: item.expiry_date || '' });
  };

  const handleManualEditChange = (e) => {
    setEditManualItem({ ...editManualItem, [e.target.name]: e.target.value });
  };

  const handleManualEditSave = () => {
    setManualList(list => list.map(i => i.ingredient_id === editManualId ? { ...i, ...editManualItem } : i));
    setEditManualId(null);
  };

  const handleManualEditCancel = () => {
    setEditManualId(null);
  };

  const handleAutoEdit = (item) => {
    setEditAutoId(item.ingredient_id);
    setEditAutoItem({ to_buy: item.to_buy, unit: item.unit, expiry_date: item.expiry_date, category: item.category });
  };

  const handleAutoEditChange = (e) => {
    setEditAutoItem({ ...editAutoItem, [e.target.name]: e.target.value });
  };

  const handleAutoEditSave = (id) => {
    setList(list => list.map(item => item.ingredient_id === id ? { ...item, ...editAutoItem } : item));
    setEditAutoId(null);
  };

  const handleAutoEditCancel = () => {
    setEditAutoId(null);
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 20 }}>
      <h1>自動產生採買清單</h1>
      <div style={{ marginBottom: 16 }}>
        <label>週起始日：</label>
        <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
        <button onClick={fetchList} style={{ marginLeft: 8 }}>重新產生</button>
      </div>
      {loading ? <div>載入中...</div> : error ? <div style={{ color: 'red' }}>{error}</div> : (
        <>
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>勾選</th>
              <th>食材</th>
              <th>總需求</th>
              <th>庫存</th>
              <th>需採買</th>
              <th>單位</th>
              <th>到期日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map(item => (
              <tr key={item.ingredient_id} style={item.to_buy > 0 ? (item.expiry_date && new Date(item.expiry_date) < new Date() ? { background: '#ffe0e0' } : {}) : { color: '#aaa' }}>
                <td>
                  <input type="checkbox" checked={!!checked[item.ingredient_id]} onChange={() => handleCheck(item.ingredient_id)} />
                </td>
                <td>{item.name}</td>
                <td>{item.total_needed}</td>
                <td>{item.stock}</td>
                {editAutoId === item.ingredient_id ? (
                  <>
                    <td><input name="to_buy" type="number" min="0" value={editAutoItem.to_buy} onChange={handleAutoEditChange} style={{ width: 60 }} /></td>
                    <td><input name="unit" value={editAutoItem.unit} onChange={handleAutoEditChange} style={{ width: 60 }} /></td>
                    <td><input name="expiry_date" type="date" value={editAutoItem.expiry_date} onChange={handleAutoEditChange} style={{ width: 100 }} /></td>
                    <td>
                      <button onClick={() => handleAutoEditSave(item.ingredient_id)} style={{ padding: '5px 10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>儲存</button>
                      <button onClick={handleAutoEditCancel} style={{ padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginLeft: 8 }}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ color: item.to_buy > 0 ? 'red' : '#aaa' }}>{item.to_buy}</td>
                    <td>{item.unit}</td>
                    <td>{item.expiry_date}</td>
                    <td>
                      <button onClick={() => handleAutoEdit(item)} style={{ padding: '5px 10px', background: '#FFC107', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>編輯</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {manualList.map(item => (
              <tr key={item.ingredient_id}>
                <td>
                  <input type="checkbox" checked={!!checked[item.ingredient_id]} onChange={() => handleCheck(item.ingredient_id)} />
                </td>
                {editManualId === item.ingredient_id ? (
                  <>
                    <td><input name="name" value={editManualItem.name} onChange={handleManualEditChange} style={{ width: 100 }} /></td>
                    <td>-</td>
                    <td>-</td>
                    <td><input name="to_buy" type="number" min="1" value={editManualItem.to_buy} onChange={handleManualEditChange} style={{ width: 60 }} /></td>
                    <td><input name="unit" value={editManualItem.unit} onChange={handleManualEditChange} style={{ width: 60 }} /></td>
                    <td><input name="expiry_date" type="date" value={editManualItem.expiry_date} onChange={handleManualEditChange} style={{ width: 100 }} /></td>
                    <td>
                      <button onClick={handleManualEditSave}>儲存</button>
                      <button onClick={handleManualEditCancel} style={{ marginLeft: 8 }}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{item.name}</td>
                    <td>-</td>
                    <td>-</td>
                    <td style={{ color: 'red' }}>{item.to_buy}</td>
                    <td>{item.unit}</td>
                    <td>{item.expiry_date}</td>
                    <td>
                      <button onClick={() => handleManualEdit(item)}>編輯</button>
                      <button onClick={() => setManualList(list => list.filter(i => i.ingredient_id !== item.ingredient_id))} style={{ color: 'red', marginLeft: 8 }}>刪除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={handleManualAdd} style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <b>手動新增食材：</b>
          <input name="name" value={manualItem.name} onChange={handleManualChange} placeholder="食材名稱" required style={{ width: 120 }} />
          <input name="to_buy" value={manualItem.to_buy} onChange={handleManualChange} placeholder="需採買數量" required type="number" min="1" style={{ width: 80 }} />
          <input name="unit" value={manualItem.unit} onChange={handleManualChange} placeholder="單位" required style={{ width: 80 }} />
          <input name="expiry_date" value={manualItem.expiry_date} onChange={handleManualChange} placeholder="到期日" type="date" style={{ width: 100 }} />
          <button type="submit">新增</button>
        </form>
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={handleConfirmPurchase} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            確認採買並更新庫存
          </button>
        </div>
        </>
      )}
    </div>
  );
}

export default ShoppingListPage; 