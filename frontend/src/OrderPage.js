import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderPage = ({ onInventoryUpdate }) => {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiredItems, setRequiredItems] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedRecipeName, setSelectedRecipeName] = useState('');
  const [selectedOrderRecipes, setSelectedOrderRecipes] = useState([]);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/recipes');
      setRecipes(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('無法取得料理資料。');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipeToOrder = () => {
    if (selectedRecipeId) {
      const recipeToAdd = recipes.find(rec => rec.id === Number(selectedRecipeId));
      if (recipeToAdd && !selectedOrderRecipes.some(rec => rec.id === recipeToAdd.id)) {
        setSelectedOrderRecipes(prev => [...prev, recipeToAdd]);
        setSelectedRecipeId('');
        setMessage('');
        setError('');
      } else if (recipeToAdd) {
        setMessage('此料理已在待點選清單中。');
      }
    } else {
      setMessage('請選擇一道料理以加入訂單。');
    }
  };

  const handleRemoveRecipeFromOrder = (recipeId) => {
    setSelectedOrderRecipes(prev => prev.filter(rec => rec.id !== recipeId));
    setMessage('');
    setError('');
  };

  const handleReviewCombinedOrder = async () => {
    if (selectedOrderRecipes.length === 0) {
      setMessage('請至少選擇一道料理以預覽訂單。');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const allRequiredItems = {};
      let allRecipesAvailable = true;

      for (const recipe of selectedOrderRecipes) {
        const response = await axios.post('http://localhost:3001/serve-meal', {
          recipe_id: recipe.id
        });

        response.data.required_items.forEach(item => {
          if (allRequiredItems[item.ingredient_id]) {
            allRequiredItems[item.ingredient_id].quantity += item.quantity;
            if (!item.sufficient) {
              allRequiredItems[item.ingredient_id].sufficient = false;
            }
          } else {
            allRequiredItems[item.ingredient_id] = { ...item };
          }
          if (!item.sufficient) {
            allRecipesAvailable = false;
          }
        });
      }

      const combinedItems = Object.values(allRequiredItems).map(item => ({
        ...item,
        sufficient: item.stock >= item.quantity 
      }));

      setRequiredItems(combinedItems);
      setSelectedRecipeName(selectedOrderRecipes.map(r => r.name).join('、'));
      setShowConfirmation(true);
      setMessage('請檢查以下所有料理所需食材的總清單。');

    } catch (err) {
      console.error('Error getting combined required ingredients:', err.response?.data || err);
      setError(`無法取得組合訂單所需食材: ${err.response?.data?.error || err.message}`);
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeduction = async () => {
    const itemsToDeduct = requiredItems.filter(item => item.checked);

    if (itemsToDeduct.some(item => !item.sufficient)) {
        setError('無法扣除：您勾選的項目中包含庫存不足的食材。');
        return;
    }

    if (itemsToDeduct.length === 0 && requiredItems.some(item => !item.sufficient)) {
        setError('部分食材庫存不足，請先補足庫存或取消點餐。');
        return;
    }
    
    if (itemsToDeduct.length === 0 && requiredItems.every(item => item.sufficient)) {
      setError('請勾選至少一項要扣除的食材。');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');
      const recipeIdsToDeduct = selectedOrderRecipes.map(rec => rec.id);
      const response = await axios.post('http://localhost:3001/deduct-meal-ingredients', {
        recipe_ids: recipeIdsToDeduct
      });
      setMessage(response.data.message);
      setShowConfirmation(false);
      setRequiredItems([]);
      setSelectedRecipeId('');
      setSelectedRecipeName('');
      setSelectedOrderRecipes([]);

      if (onInventoryUpdate) {
        onInventoryUpdate();
      }
    } catch (err) {
      console.error('Error deducting meal ingredients:', err.response?.data || err);
      if (err.response && err.response.data && err.response.data.error === '庫存不足') {
        let missingMsg = err.response.data.message + '\n';
        err.response.data.missing_ingredients.forEach(item => {
          missingMsg += `- ${item.name} (需要: ${item.needed} ${item.unit}, 現有: ${item.available} ${item.unit})\n`;
        });
        setError(missingMsg);
      } else {
        setError(`扣除庫存失敗: ${err.response?.data?.error || err.message}`);
      }
      setShowConfirmation(true); 
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (ingredientId) => {
    setRequiredItems(prevItems =>
      prevItems.map(item =>
        item.ingredient_id === ingredientId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1>點餐服務</h1>

      {loading && <p>處理中...</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{error}</p>}

      {!showConfirmation && (
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="recipe-select">選擇料理：</label>
          <select
            id="recipe-select"
            value={selectedRecipeId}
            onChange={(e) => {
              setSelectedRecipeId(e.target.value);
              setMessage('');
              setError('');
            }}
            style={{ width: '100%', padding: 8, marginTop: 5, borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">--請選擇一道料理--</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name} ({recipe.meal_type === 'breakfast' ? '早餐' : recipe.meal_type === 'lunch' ? '午餐' : '晚餐'})
              </option>
            ))}
          </select>
          <button
            onClick={handleAddRecipeToOrder}
            disabled={loading || !selectedRecipeId}
            style={{ padding: '10px 20px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 10, marginRight: 10 }}
          >
            加入點餐清單
          </button>
          <button
            onClick={handleReviewCombinedOrder}
            disabled={loading || selectedOrderRecipes.length === 0}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 10 }}
          >
            檢視所有待點餐料理所需的食材
          </button>
        </div>
      )}

      {!showConfirmation && selectedOrderRecipes.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 20, border: '1px solid #ddd', padding: 15, borderRadius: 5 }}>
          <h3>已選擇待點餐料理 ({selectedOrderRecipes.length})：</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {selectedOrderRecipes.map(rec => (
              <li key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dotted #eee' }}>
                {rec.name} ({rec.meal_type === 'breakfast' ? '早餐' : rec.meal_type === 'lunch' ? '午餐' : '晚餐'})
                <button 
                  onClick={() => handleRemoveRecipeFromOrder(rec.id)}
                  style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1.2em' }}
                >&times;</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showConfirmation && (
        <div style={{ marginTop: 20 }}>
          <h2>確認所選料理「{selectedRecipeName}」所需食材總清單</h2>
          {requiredItems.length > 0 ? (
            <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr>
                  <th>勾選</th>
                  <th>食材名稱</th>
                  <th>所需總數量</th>
                  <th>現有庫存</th>
                  <th>單位</th>
                  <th>庫存狀態</th>
                </tr>
              </thead>
              <tbody>
                {requiredItems.map((item) => (
                  <tr key={item.ingredient_id} style={{ backgroundColor: item.sufficient ? '' : '#ffe0e0' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleCheckboxChange(item.ingredient_id)}
                        disabled={!item.sufficient}
                      />
                    </td>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.stock}</td>
                    <td>{item.unit}</td>
                    <td style={{ color: item.sufficient ? 'green' : 'red' }}>
                      {item.sufficient ? '足夠' : '不足'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>此訂單中的料理不需要任何食材。</p>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleConfirmDeduction}
              disabled={loading || requiredItems.every(item => !item.checked)}
              style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              確認扣除庫存
            </button>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setRequiredItems([]);
                setMessage('');
                setError('');
              }}
              style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {!showConfirmation && (
        <>
          <h2 style={{ marginTop: 40 }}>所有料理列表</h2>
          {recipes.length > 0 ? (
            <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>料理名稱</th>
                  <th>餐別</th>
                  <th>料理類別</th>
                  <th>備註</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((rec) => (
                  <tr key={rec.id}>
                    <td>{rec.name}</td>
                    <td>{rec.meal_type === 'breakfast' ? '早餐' : rec.meal_type === 'lunch' ? '午餐' : '晚餐'}</td>
                    <td>{rec.recipe_category_name || '無類別'}</td>
                    <td>{rec.description || '無'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>沒有料理可供顯示。</p>
          )}
        </>
      )}
    </div>
  );
};

export default OrderPage; 