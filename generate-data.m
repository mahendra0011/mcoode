// Generate 20 subscribers and 20 todos
let
    // Generate subscribers
    subscriberNames = List.Generate(() => 1, each _ <= 20, each _ + 1),
    subscribers = List.Transform(subscriberNames, each 
        let
            id = Number.ToText(_, "000"),
            name = "User " & id,
            email = "user" & id & "@example.com"
        in
            [
                id = "sub-" & id,
                name = name,
                email = email,
                status = if Number.Mod(_, 2) = 0 then "active" else "inactive",
                created_at = DateTime.ToText(DateTime.LocalNow()),
                preferences = [
                    notifications = Number.Mod(_, 3) = 0,
                    theme = if Number.Mod(_, 2) = 0 then "dark" else "light"
                ]
            ]
    ),
    
    // Generate todos
    todoTasks = List.Generate(() => 1, each _ <= 20, each _ + 1),
    todos = List.Transform(todoTasks, each
        let
            id = Number.ToText(_, "000"),
            priority = if Number.Mod(_, 3) = 0 then "high" else if Number.Mod(_, 3) = 1 then "medium" else "low",
            status = if Number.Mod(_, 4) = 0 then "completed" else if Number.Mod(_, 4) = 1 then "in-progress" else "pending"
        in
            [
                id = "todo-" & id,
                title = "Task " & id,
                description = "Description for task " & id,
                priority = priority,
                status = status,
                created_at = DateTime.ToText(DateTime.LocalNow()),
                due_date = DateTime.ToText(DateTime.AddDays(DateTime.LocalNow(), _ * 2))
            ]
    ),
    
    // Combine results
    result = [
        subscribers = subscribers,
        todos = todos
    ]
in
    result