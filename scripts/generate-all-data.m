// Generate all subscriber and todo data files
// This script creates 20 subscriber files and 20 todo files

let
    // Generate subscriber data
    GenerateSubscribers = () => (
        let
            SubscriberNumbers = {1..20},
            SubscriberData = List.Transform(SubscriberNumbers, each [
                id = "subscriber-" & Text.PadStart(Text.From(_), 2, "0"),
                name = "Subscriber " & _,
                email = "subscriber" & _ & "@example.com",
                status = if Number.Mod(_, 2) = 0 then "active" else "inactive"
            ]),
            // Write each subscriber to a JSON file
            WriteSubscribers = List.Accumulate(SubscriberData, [], (state, current) => 
                state & {
                    File.Contents("subscribers/" & current[id] & ".json")
                }
            )
        in
            WriteSubscribers
    ),
    
    // Generate todo data
    GenerateTodos = () => (
        let
            TodoNumbers = {1..20},
            TodoData = List.Transform(TodoNumbers, each [
                id = "todo-" & Text.PadStart(Text.From(_), 2, "0"),
                title = "Task " & _ & " - Complete processing",
                description = "Process data for item " & _,
                status = if Number.Mod(_, 3) = 0 then "completed" else if Number.Mod(_, 3) = 1 then "in-progress" else "pending",
                priority = if _ <= 5 then "high" else if _ <= 10 then "medium" else "low"
            ]),
            // Write each todo to a JSON file
            WriteTodos = List.Accumulate(TodoData, [], (state, current) => 
                state & {
                    File.Contents("todos/" & current[id] & ".json")
                }
            )
        in
            WriteTodos
    ),
    
    // Main execution
    AllSubscribers = GenerateSubscribers(),
    AllTodos = GenerateTodos(),
    
    // Combine results
    Result = [
        subscribers = AllSubscribers,
        todos = AllTodos,
        totalFiles = List.Count(AllSubscribers) + List.Count(AllTodos)
    ]
in
    Result