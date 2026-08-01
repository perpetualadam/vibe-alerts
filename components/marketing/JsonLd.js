/**
 * Renders JSON-LD structured data for SEO/AEO crawlers.
 * @param {object | object[]} data
 */
export default function JsonLd({ data }) {
  const schemas = Array.isArray(data) ? data : [data];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
