export default function DataTable({ headers, rows, emptyMessage = 'No data available.' }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="no-data">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => <tr key={i}>{row}</tr>)
          )}
        </tbody>
      </table>
    </div>
  );
}
