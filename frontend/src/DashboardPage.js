import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DashboardPage = () => {
  const [expiringIngredients, setExpiringIngredients] = useState([]);
  const [lowStockIngredients, setLowStockIngredients] = useState([]);
  const [weeklyPlanSummary, setWeeklyPlanSummary] = useState([]);
  const [shoppingListSummary, setShoppingListSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [expiringRes, lowStockRes, weeklyPlanRes, shoppingListRes] = await Promise.all([
          axios.get('http://localhost:3001/dashboard/expiring-ingredients'),
          axios.get('http://localhost:3001/dashboard/low-stock-ingredients'),
          axios.get('http://localhost:3001/dashboard/weekly-plan-summary'),
          axios.get('http://localhost:3001/dashboard/shopping-list-summary'),
        ]);
        setExpiringIngredients(expiringRes.data);
        setLowStockIngredients(lowStockRes.data);
        setWeeklyPlanSummary(weeklyPlanRes.data);
        setShoppingListSummary(shoppingListRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('無法載入儀表板資料。');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>載入中...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const getDayName = (dayOfWeek) => {
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return days[dayOfWeek];
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1>儀表板</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 15, boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
          <h2>即將到期的食材 ({expiringIngredients.length} 項)</h2>
          {expiringIngredients.length > 0 ? (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {expiringIngredients.map((item, index) => (
                <li key={index} style={{ marginBottom: 5 }}>
                  {item.name} ({item.stock} {item.unit}) - 到期日: {new Date(item.expiry_date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>無即將到期的食材。</p>
          )}
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 15, boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
          <h2>庫存不足的食材 ({lowStockIngredients.length} 項)</h2>
          {lowStockIngredients.length > 0 ? (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {lowStockIngredients.map((item, index) => (
                <li key={index} style={{ marginBottom: 5 }}>
                  {item.name} ({item.stock} {item.unit})
                </li>
              ))}
            </ul>
          ) : (
            <p>無庫存不足的食材。</p>
          )}
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 15, boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
          <h2>採買清單摘要</h2>
          <p>總計待採買項目: {shoppingListSummary.total_shopping_list_items || 0} 項</p>
          <p style={{ fontSize: '0.9em', color: '#666' }}> (包含即將到期和庫存不足的食材估計)</p>
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 15, boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
        <h2>本週菜單概覽</h2>
        {weeklyPlanSummary.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'left' }}>星期</th>
                <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'left' }}>早餐</th>
                <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'left' }}>午餐</th>
                <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'left' }}>晚餐</th>
              </tr>
            </thead>
            <tbody>
              {weeklyPlanSummary.map((plan, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{getDayName(plan.day_of_week)}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{plan.breakfast_recipe_name || '-'}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{plan.lunch_recipe_name || '-'}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{plan.dinner_recipe_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>本週無排定菜單。</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage; 