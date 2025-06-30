import React, { useEffect, useState } from 'react';
import axios from 'axios';

const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const mealTypes = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' }
];

function WeeklyPlanPage() {
  const [weekStart, setWeekStart] = useState(() => {
    // 預設本週一
    const now = new Date();
    const day = now.getDay() || 7;
    now.setDate(now.getDate() - day + 1);
    return now.toISOString().slice(0, 10);
  });
  const [recipes, setRecipes] = useState([]);
  const [plan, setPlan] = useState([]); // [{day_of_week, breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState([]); // [{recipe_id, can_make}]

  // 取得所有料理
  const fetchRecipes = async () => {
    const res = await axios.get('http://localhost:3001/recipes');
    setRecipes(res.data);
  };

  // 取得本週菜單
  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/weekly-plan', { params: { week_start_date: weekStart } });
      setPlan(res.data.length ? res.data : Array(7).fill(0).map((_, i) => ({ day_of_week: i + 1, breakfast_recipe_id: '', lunch_recipe_id: '', dinner_recipe_id: '' })));
      setError('');
    } catch (err) {
      setError('無法取得菜單');
    }
    setLoading(false);
  };

  // 取得料理可製作狀態
  const fetchAvailability = async () => {
    const res = await axios.get('http://localhost:3001/recipe-availability');
    setAvailability(res.data);
  };

  useEffect(() => {
    fetchRecipes();
    fetchAvailability();
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [weekStart]);

  // 處理菜單選擇
  const handleSelect = (dayIdx, mealKey, recipeId) => {
    setPlan(plan => plan.map((row, i) => i === dayIdx ? { ...row, [`${mealKey}_recipe_id`]: recipeId } : row));
  };

  // 儲存菜單
  const handleSave = async () => {
    try {
      await axios.post('http://localhost:3001/weekly-plan', {
        week_start_date: weekStart,
        plans: plan.map((row, i) => ({ ...row, day_of_week: i + 1 }))
      });
      alert('儲存成功！');
    } catch {
      alert('儲存失敗');
    }
  };

  // 判斷料理是否可製作
  const canMake = (recipeId) => {
    const found = availability.find(a => a.recipe_id === recipeId);
    return found ? found.can_make : true;
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
      <h1>一週菜單規劃</h1>
      <div style={{ marginBottom: 16 }}>
        <label>週起始日：</label>
        <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
      </div>
      {loading ? <div>載入中...</div> : error ? <div style={{ color: 'red' }}>{error}</div> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>星期</th>
              {mealTypes.map(mt => <th key={mt.key}>{mt.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {plan.map((row, dayIdx) => (
              <tr key={dayIdx}>
                <td>{days[dayIdx]}</td>
                {mealTypes.map(mt => {
                  const recipeId = row[`${mt.key}_recipe_id`];
                  return (
                    <td key={mt.key}>
                      <select
                        value={recipeId || ''}
                        onChange={e => handleSelect(dayIdx, mt.key, e.target.value)}
                      >
                        <option value="">-- 請選擇 --</option>
                        {recipes.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                            {canMake(Number(r.id)) ? '' : '（食材不足）'}
                          </option>
                        ))}
                      </select>
                      {recipeId && !canMake(Number(recipeId)) && (
                        <span style={{ color: 'red', marginLeft: 4 }}>食材不足</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 24 }}>
        <button onClick={handleSave}>儲存本週菜單</button>
      </div>
    </div>
  );
}

export default WeeklyPlanPage; 