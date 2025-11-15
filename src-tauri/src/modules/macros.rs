// Declare a new macro named `userDefault`
#[macro_export]
macro_rules! DefaultStruct {
    // This is the macro *pattern* it accepts.
    // It matches code like:
    //
    // model! {
    //     pub struct NetworkInfo { ... }
    // }
    //
    // Let's break down the pattern:

    (
        // `$vis:vis` → match a Rust visibility keyword (pub, pub(crate), or nothing)
        // and store it in the variable `$vis`.
        // $vis:vis
        pub

        // The literal keyword `struct` must appear.
        // Macro only works for structs.
        struct

        // `$name:ident` → match an identifier (struct name)
        // e.g. NetworkInfo, User, Settings
        $name:ident

        // The struct body: `{ ... }`
        // `$($field:tt)*` → tt = token tree, match ANY tokens inside `{ }`
        // `*` means repeat 0 or more times.
        {
            $( $field:ident : $type:ty ),* $(,)?
        }
    ) => {

        // Everything here is the macro *output*.
        // It replaces the input struct with this expanded code:

        #[derive(Debug, Serialize, Clone)]  
        // Automatically apply common derives

        #[serde(rename_all = "camelCase")]
        // Apply serde rule to rename fields to camelCase

        // Insert the matched visibility (pub or nothing)
        pub struct $name {
            // Insert all struct fields as-is
            $( pub $field : $type ),*
        }
    };
}

#[macro_export]
macro_rules! GlobalStruct {
    (
        pub struct $name:ident {
            $( $field:ident : $type:ty ),* $(,)?
        }
    ) => {
        #[derive(Debug)]
        pub struct $name {
            $( pub $field : $type ),*
        }

        impl $name {
            pub fn new() -> Self {
                Self {
                    $( $field : Default::default() ),*
                }
            }
        }
    };
}