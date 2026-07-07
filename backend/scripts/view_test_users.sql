-- Ver usuários de teste
SELECT 
    id,
    email,
    name,
    created_at,
    (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as transaction_count,
    (SELECT COUNT(*) FROM goals WHERE user_id = users.id) as goal_count,
    (SELECT COUNT(*) FROM accounts WHERE user_id = users.id) as account_count,
    (SELECT COUNT(*) FROM categories WHERE user_id = users.id) as category_count
FROM users
WHERE 
    email LIKE '%@test.com%'
    OR email LIKE '%@example.com%'
    OR email LIKE '%test@%'
    OR email LIKE '%demo@%'
    OR email LIKE '%teste@%'
    OR email LIKE '%+test%'
ORDER BY created_at DESC;
