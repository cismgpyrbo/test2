// 基本後端骨架：Express + SQLite
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// 資料庫初始化
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) {
    console.error('資料庫連線失敗:', err.message);
  } else {
    console.log('已連線到 SQLite 資料庫');
  }
});

// 建立資料表（如不存在）
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT,
    stock INTEGER DEFAULT 0,
    expiry_date TEXT,
    category_id INTEGER,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  // 檢查並新增 category_id 欄位（如果不存在）
  db.all(`PRAGMA table_info(ingredients)`, (err, columns) => {
    if (err) {
      console.error("Error checking table info for ingredients:", err.message);
      return;
    }
    const hasCategoryId = columns.some(col => col.name === 'category_id');
    if (!hasCategoryId) {
      db.run(`ALTER TABLE ingredients ADD COLUMN category_id INTEGER`, (err) => {
        if (err) {
          console.error("Error adding category_id column to ingredients table:", err.message);
        } else {
          console.log("Added 'category_id' column to 'ingredients' table.");
          // 移除舊的 category 欄位（如果存在）並將其數據遷移到新的 category_id 欄位
          // 這是一個複雜的操作，因為 SQLite 不直接支持 ALTER COLUMN TYPE 或 DROP COLUMN WITH DATA
          // 最好的方式是創建一個新表，遷移數據，然後刪除舊表並重命名新表。
          // 為了簡化，這裡僅添加新欄位，並在 API 中處理 category 到 category_id 的轉換（如果 category 仍被使用）
          // 或者要求用戶手動處理數據遷移，或在開發階段重置數據庫。
          // 為了避免數據丟失和過度複雜化，我們將保留舊的 `category` 欄位，並僅使用 `category_id`。
          db.all(`PRAGMA table_info(ingredients)`, (err, columnsAfterAdd) => {
            if (err) {
              console.error("Error checking table info after add category_id:", err.message);
              return;
            }
            const hasOldCategory = columnsAfterAdd.some(col => col.name === 'category');
            if (hasOldCategory) {
              console.warn("Old 'category' column still exists. Please consider migrating data to 'category_id' and removing it manually if no longer needed.");
            }
          });
        }
      });
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    meal_type TEXT,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER,
    ingredient_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY(recipe_id) REFERENCES recipes(id),
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS weekly_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start_date TEXT,
    day_of_week INTEGER,
    breakfast_recipe_id INTEGER,
    lunch_recipe_id INTEGER,
    dinner_recipe_id INTEGER,
    FOREIGN KEY(breakfast_recipe_id) REFERENCES recipes(id),
    FOREIGN KEY(lunch_recipe_id) REFERENCES recipes(id),
    FOREIGN KEY(dinner_recipe_id) REFERENCES recipes(id)
  )`);

  // 新增 categories 資料表
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);
});

// 測試 API
app.get('/', (req, res) => {
  res.send('食材與料理管理系統 API 運作中');
});

// 取得所有食材，並包含類別名稱
app.get('/ingredients', (req, res) => {
  const sql = `SELECT i.*, c.name AS category_name FROM ingredients i LEFT JOIN categories c ON i.category_id = c.id`;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 新增食材
app.post('/ingredients', (req, res) => {
  const { name, unit, stock, expiry_date, category_id } = req.body;
  db.run(
    'INSERT INTO ingredients (name, unit, stock, expiry_date, category_id) VALUES (?, ?, ?, ?, ?)',
    [name, unit, stock, expiry_date, category_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// 取得所有料理
app.get('/recipes', (req, res) => {
  db.all('SELECT * FROM recipes', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 新增料理
app.post('/recipes', (req, res) => {
  const { name, meal_type, description } = req.body;
  db.run(
    'INSERT INTO recipes (name, meal_type, description) VALUES (?, ?, ?)',
    [name, meal_type, description],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// 更新料理
app.put('/recipes/:id', (req, res) => {
  const { id } = req.params;
  const { name, meal_type, description } = req.body;
  db.run(
    'UPDATE recipes SET name=?, meal_type=?, description=? WHERE id=?',
    [name, meal_type, description, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

// 取得某週菜單
app.get('/weekly-plan', (req, res) => {
  const { week_start_date } = req.query;
  if (!week_start_date) {
    return res.status(400).json({ error: '缺少 week_start_date 參數' });
  }
  db.all(
    `SELECT * FROM weekly_plan WHERE week_start_date = ? ORDER BY day_of_week ASC`,
    [week_start_date],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 設定某週菜單（批次 upsert）
app.post('/weekly-plan', (req, res) => {
  const { week_start_date, plans } = req.body;
  // plans: [{ day_of_week, breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id }]
  if (!week_start_date || !Array.isArray(plans)) {
    return res.status(400).json({ error: '缺少參數' });
  }
  const stmtInsert = db.prepare(
    `INSERT INTO weekly_plan (week_start_date, day_of_week, breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id)
     VALUES (?, ?, ?, ?, ?)`
  );
  const stmtUpdate = db.prepare(
    `UPDATE weekly_plan SET breakfast_recipe_id=?, lunch_recipe_id=?, dinner_recipe_id=?
     WHERE week_start_date=? AND day_of_week=?`
  );
  db.serialize(() => {
    plans.forEach(plan => {
      db.get(
        `SELECT id FROM weekly_plan WHERE week_start_date=? AND day_of_week=?`,
        [week_start_date, plan.day_of_week],
        (err, row) => {
          if (row) {
            stmtUpdate.run(
              plan.breakfast_recipe_id,
              plan.lunch_recipe_id,
              plan.dinner_recipe_id,
              week_start_date,
              plan.day_of_week
            );
          } else {
            stmtInsert.run(
              week_start_date,
              plan.day_of_week,
              plan.breakfast_recipe_id,
              plan.lunch_recipe_id,
              plan.dinner_recipe_id
            );
          }
        }
      );
    });
  });
  res.json({ success: true });
});

// 產生指定週的採買清單
app.post('/generate-shopping-list', (req, res) => {
  const { week_start_date } = req.body;
  if (!week_start_date) {
    return res.status(400).json({ error: '缺少 week_start_date 參數' });
  }
  // 1. 取得該週所有菜單的 recipe_id
  db.all(
    `SELECT breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id FROM weekly_plan WHERE week_start_date = ?`,
    [week_start_date],
    (err, plans) => {
      if (err) return res.status(500).json({ error: err.message });
      // 收集所有 recipe_id
      const recipeIds = [];
      plans.forEach(plan => {
        if (plan.breakfast_recipe_id) recipeIds.push(plan.breakfast_recipe_id);
        if (plan.lunch_recipe_id) recipeIds.push(plan.lunch_recipe_id);
        if (plan.dinner_recipe_id) recipeIds.push(plan.dinner_recipe_id);
      });
      if (recipeIds.length === 0) return res.json([]);
      // 2. 取得所有 recipe_ingredients
      db.all(
        `SELECT ingredient_id, SUM(quantity) as total_needed FROM recipe_ingredients WHERE recipe_id IN (${recipeIds.map(() => '?').join(',')}) GROUP BY ingredient_id`,
        recipeIds,
        (err, ingredientNeeds) => {
          if (err) return res.status(500).json({ error: err.message });
          if (ingredientNeeds.length === 0) return res.json([]);
          // 3. 取得所有食材庫存
          db.all(
            `SELECT id, name, unit, stock, expiry_date FROM ingredients WHERE id IN (${ingredientNeeds.map(i => '?').join(',')})`,
            ingredientNeeds.map(i => i.ingredient_id),
            (err, ingredients) => {
              if (err) return res.status(500).json({ error: err.message });
              // 4. 合併計算需採買數量
              const result = ingredientNeeds.map(need => {
                const ing = ingredients.find(i => i.id === need.ingredient_id);
                const stock = ing ? ing.stock : 0;
                return {
                  ingredient_id: need.ingredient_id,
                  name: ing ? ing.name : '',
                  unit: ing ? ing.unit : '',
                  total_needed: need.total_needed,
                  stock: stock,
                  to_buy: Math.max(need.total_needed - stock, 0),
                  expiry_date: ing ? ing.expiry_date : null
                };
              });
              res.json(result);
            }
          );
        }
      );
    }
  );
});

// 食材比對分析：顯示所有料理可否製作及缺少的材料
app.get('/recipe-availability', (req, res) => {
  // 1. 取得所有食材庫存
  db.all('SELECT id, name, stock, unit FROM ingredients', (err, ingredients) => {
    if (err) return res.status(500).json({ error: err.message });
    // 2. 取得所有料理
    db.all('SELECT * FROM recipes', (err, recipes) => {
      if (err) return res.status(500).json({ error: err.message });
      if (recipes.length === 0) return res.json([]);
      // 3. 取得所有料理所需食材
      db.all('SELECT * FROM recipe_ingredients', (err, recipe_ings) => {
        if (err) return res.status(500).json({ error: err.message });
        // 4. 分析每道料理
        const result = recipes.map(recipe => {
          const needs = recipe_ings.filter(ri => ri.recipe_id === recipe.id);
          const missing = needs.filter(need => {
            const ing = ingredients.find(i => i.id === need.ingredient_id);
            return !ing || ing.stock < need.quantity;
          }).map(need => {
            const ing = ingredients.find(i => i.id === need.ingredient_id);
            return {
              ingredient_id: need.ingredient_id,
              name: ing ? ing.name : '',
              required: need.quantity,
              stock: ing ? ing.stock : 0,
              unit: ing ? ing.unit : ''
            };
          });
          return {
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            can_make: missing.length === 0,
            missing_ingredients: missing
          };
        });
        res.json(result);
      });
    });
  });
});

// 刪除食材
app.delete('/ingredients/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM ingredients WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 更新食材
app.put('/ingredients/:id', (req, res) => {
  const { id } = req.params;
  const { name, unit, stock, expiry_date, category_id } = req.body; // 增加 category_id
  db.run(
    'UPDATE ingredients SET name = COALESCE(?,name), unit = COALESCE(?,unit), stock = COALESCE(?,stock), expiry_date = COALESCE(?,expiry_date), category_id = COALESCE(?,category_id) WHERE id=?',
    [name, unit, stock, expiry_date, category_id, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

// 取得某料理的配方（所需食材與數量）
app.get('/recipes/:id/ingredients', (req, res) => {
  const recipeId = req.params.id;
  db.all(
    `SELECT ri.id, ri.ingredient_id, i.name, i.unit, ri.quantity
     FROM recipe_ingredients ri
     JOIN ingredients i ON ri.ingredient_id = i.id
     WHERE ri.recipe_id = ?`,
    [recipeId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 新增配方食材
app.post('/recipes/:id/ingredients', (req, res) => {
  const recipeId = req.params.id;
  const { ingredient_id, quantity } = req.body;
  db.run(
    'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)',
    [recipeId, ingredient_id, quantity],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// 更新配方食材
app.put('/recipe_ingredients/:id', (req, res) => {
  const id = req.params.id;
  const { ingredient_id, quantity } = req.body;
  db.run(
    'UPDATE recipe_ingredients SET ingredient_id=?, quantity=? WHERE id=?',
    [ingredient_id, quantity, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// 刪除配方食材
app.delete('/recipe_ingredients/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM recipe_ingredients WHERE id=?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 確認購買並更新庫存
app.post('/ingredients/confirm-purchase', (req, res) => {
  const purchases = req.body; // [{ ingredient_id?: number, name: string, unit: string, quantity: number, expiry_date?: string }]

  db.serialize(() => {
    purchases.forEach(purchase => {
      const { name, unit, quantity, expiry_date } = purchase; // 現在總是使用 name, unit, quantity, expiry_date

      // 嘗試找到名稱、單位和到期日都符合的食材批次
      db.get(
        'SELECT id, stock FROM ingredients WHERE name = ? AND unit = ? AND expiry_date = ?',
        [name, unit, expiry_date || null], // 如果沒有到期日，則匹配 null
        (err, row) => {
          if (err) {
            console.error(`Error checking existing ingredient batch ${name} (${expiry_date}):`, err.message);
            return;
          }

          if (row) {
            // 找到現有批次，更新庫存
            const newStock = row.stock + quantity;
            db.run('UPDATE ingredients SET stock = ? WHERE id = ?', [newStock, row.id], function(err) {
              if (err) console.error(`Error updating stock for existing batch ${name} (${expiry_date}):`, err.message);
            });
          } else {
            // 沒有找到完全匹配的批次，新增一筆新的食材記錄
            db.run(
              'INSERT INTO ingredients (name, unit, stock, expiry_date, category_id) VALUES (?, ?, ?, ?, ?)',
              [name, unit, quantity, expiry_date || null, purchase.category_id || null],
              function(err) {
                if (err) console.error(`Error inserting new ingredient batch ${name} (${expiry_date}):`, err.message);
              }
            );
          }
        }
      );
    });
    res.json({ success: true });
  });
});

// 取得所有類別
app.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 新增類別
app.post('/categories', (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO categories (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// 更新類別
app.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  db.run('UPDATE categories SET name=? WHERE id=?', [name, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 刪除類別
app.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  // 為了避免影響現有食材，刪除類別時，將使用該類別的食材的 category_id 設為 NULL
  db.serialize(() => {
    db.run('UPDATE ingredients SET category_id = NULL WHERE category_id = (SELECT id FROM categories WHERE id = ?)', [id], (err) => {
      if (err) console.error('Error updating ingredients on category delete:', err.message);
    });
    db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
}); 