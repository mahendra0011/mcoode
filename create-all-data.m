// Complete M script to generate 20 subscribers and 20 todos
let
    // Function to create subscriber record
    CreateSubscriber = (index as number) as record =>
        let
            id = "sub-" & Number.ToText(index, "000"),
            name = "User " & Number.ToText(index, "000"),
            email = "user" & Number.ToText(index, "000") & "@example.com",
            status = if Number.Mod(index, 2) = 0 then "active" else "inactive",
            created = DateTime.ToText(DateTime.LocalNow()),
            notifications = Number.Mod(index, 3) = 0,
            theme = if Number.Mod(index, 2) = 0 then "dark" else "light"
        in
            [
                id = id,
                name = name,
                email = email,
                status = status,
                created_at = created,
                preferences = [
                    notifications = notifications,
                    theme = theme
                ]
            ],
    
    // Function to create todo record
    CreateTodo = (index as number) as record =>
        let
            id = "todo-" & Number.ToText(index, "000"),
            title = "Task " & Number.ToText(index, "000"),
            description = "Description for task " & Number.ToText(index, "000"),
            priority = if Number.Mod(index, 3) = 0 then "high" else if Number.Mod(index, 3) = 1 then "medium" else "low",
            status = if Number.Mod(index, 4) = 0 then "completed" else if Number.Mod(index, 4) = 1 then "in-progress" else "pending",
            created = DateTime.ToText(DateTime.LocalNow()),
            dueDate = DateTime.ToText(DateTime.AddDays(DateTime.LocalNow(), index * 2))
        in
            [
                id = id,
                title = title,
                description = description,
                priority = priority,
                status = status,
                created_at = created,
                due_date = dueDate
            ],
    
    // Generate list of indices 1-20
    indices = {1..20},
    
    // Create subscribers list
    subscribers = List.Transform(indices, each CreateSubscriber(_)),
    
    // Create todos list
    todos = List.Transform(indices, each CreateTodo(_)),
    
    // Final result
    result = [
        subscribers = subscribers,
        todos = todos,
        subscriberCount = List.Count(subscribers),
        todoCount = List.Count(todos)
    ]
in
    result