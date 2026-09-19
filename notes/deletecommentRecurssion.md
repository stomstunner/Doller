
# Delete all child replies recursively


```jsx
const deleteRepliesRecursively = async (
    parentId
) => {

    // Parent ke direct replies lao

    const replies =
        await Comment.find({

            parentComment: parentId
        })

    // Har reply ke children pe bhi same logic lagao

    for (const reply of replies) {

        await deleteRepliesRecursively(
            reply._id
        )

        // Child reply ko permanently delete karo

        await Comment.findByIdAndDelete(
            reply._id
        )
    }
}

```