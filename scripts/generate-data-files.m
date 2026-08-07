// Script to generate 20 subscriber JSON files and 20 todo JSON files
let
    // Generate subscriber files
    GenerateSubscribers = () =>
        let
            indices = {1..20},
            createFile = (i) => 
                let
                    id = "sub-" & Number.ToText(i, "000"),
                    name = "User " & Number.ToText(i, "000"),
                    email = "user" & Number.ToText(i, "000") & "@example.com",
                    status = if Number.Mod(i, 2) = 0 then "active" else "inactive",
                    created = DateTime.ToText(DateTime.LocalNow()),
                    notifications = Number.Mod(i, 3) = 0,
                    theme = if Number.Mod(i, 2) = 0 then "dark" else "light",
                    jsonContent = "{""id"": """ & id & """,""name"": """ & name & """,""email"": """ & email & """,""status"": """ & status & """,""created_at"": """ & created & """,""preferences"":{""notifications"":" & Text.From(notifications) & ",""theme"": """ & theme & """}}"
                in
                    jsonContent
        in
            List.Transform(indices, each [id = "sub-" & Number.ToText(_, "000"), content = createFile(_)]),
    
    // Generate todo files
    GenerateTodos = () =>
        let
            indices = {1..20},
            createFile = (i) =>
                let
                    id = "todo-" & Number.ToText(i, "000"),
                    title = "Task " & Number.ToText(i, "000"),
                    description = "Description for task " & Number.ToText(i, "000"),
                    priority = if Number.Mod(i, 3) = 0 then "high" else if Number.Mod(i, 3) = 1 then "medium" else "low",
                    status = if Number.Mod(i, 4) = 0 then "completed" else if Number.Mod(i, 4) = 1 then "in-progress" else "pending",
                    created = DateTime.ToText(DateTime.LocalNow()),
                    dueDate = DateTime.ToText(DateTime.AddDays(DateTime.LocalNow(), i * 2)),
                    jsonContent = "{""id"": """ & id & """,""title"": """ & title & """,""description"": """ & description & """,""priority"": """ & priority & """,""status"": """ & status & """,""created_at"": """ & created & """,""due_date"": """ & dueDate & """}"
                in
                    jsonContent
        in
            List.Transform(indices, each [id = "todo-" & Number.ToText(_, "000"), content = createFile(_)]),
    
    // Execute generation
    subscribers = GenerateSubscribers(),
    todos = GenerateTodos()
in
    [subscribers = subscribers, todos = todos]