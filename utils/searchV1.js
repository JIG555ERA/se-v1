const normalize = (text = "") =>
  String(text).toLowerCase().trim()

export const searchData = (data, searchTerm) => {
  const query = normalize(searchTerm)

  if (!query) return []

  return data
    .map(item => {
      const fields = {
        ISBN: item.ISBN,
        title: item.title,
        author: item.author,
        description: item.description,
        category: item.category,
        genre: item.genre,
      }

      const matchedFields = Object.entries(fields)
        .filter(([_, value]) => {
          const text = normalize(value)
          return text.includes(query)   // ✅ FIX
        })
        .map(([field, value]) => ({ field, value }))

      return matchedFields.length
        ? { ...item, matchedFields }
        : null
    })
    .filter(Boolean)
}