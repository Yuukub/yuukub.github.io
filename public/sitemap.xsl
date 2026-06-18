<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  exclude-result-prefixes="s xhtml">
  
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  
  <xsl:template match="/">
    <html lang="en">
    <head>
      <title>XML Sitemap | yuukub.com</title>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet" />
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background-color: #0b0f19;
          color: #f3f4f6;
          margin: 0;
          padding: 2rem 1.5rem;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        header {
          margin-bottom: 2rem;
          border-bottom: 1px solid #1f2937;
          padding-bottom: 1.5rem;
        }
        h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #3b82f6;
          margin: 0 0 0.5rem 0;
        }
        p {
          color: #9ca3af;
          margin: 0;
          font-size: 0.95rem;
        }
        .stats {
          display: flex;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        .stat-badge {
          background-color: #1e293b;
          border: 1px solid #334155;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #94a3b8;
        }
        .stat-badge span {
          color: #3b82f6;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          background-color: #111827;
          border: 1px solid #1f2937;
          border-radius: 12px;
          overflow: hidden;
        }
        th, td {
          padding: 0.875rem 1rem;
          text-align: left;
          font-size: 0.875rem;
        }
        th {
          background-color: #1f2937;
          font-weight: 600;
          color: #e5e7eb;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        tr {
          border-bottom: 1px solid #1f2937;
          transition: background-color 0.2s ease;
        }
        tr:hover {
          background-color: #1e293b;
        }
        a {
          color: #60a5fa;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .badge {
          display: inline-block;
          font-size: 0.75rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 600;
          margin-right: 0.35rem;
          text-transform: uppercase;
        }
        .badge-th {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .badge-en {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .badge-x-default {
          background-color: rgba(156, 163, 175, 0.1);
          color: #9ca3af;
          border: 1px solid rgba(156, 163, 175, 0.2);
        }
        .badge-priority {
          background-color: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>XML Sitemap</h1>
          <p>Generated dynamically for search engine crawling and human diagnostics.</p>
          <div class="stats">
            <div class="stat-badge">Total URLs: <span><xsl:value-of select="count(s:urlset/s:url)" /></span></div>
            <div class="stat-badge">Languages: <span>TH &amp; EN</span></div>
          </div>
        </header>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Location URL</th>
              <th>Priority</th>
              <th>Language Alternates</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="s:urlset/s:url">
              <xsl:sort select="s:loc" />
              <tr>
                <td><xsl:value-of select="position()"/></td>
                <td>
                  <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
                </td>
                <td>
                  <span class="badge badge-priority"><xsl:value-of select="s:priority"/></span>
                </td>
                <td>
                  <xsl:for-each select="xhtml:link">
                    <span class="badge badge-{@hreflang}">
                      <xsl:value-of select="@hreflang" />
                    </span>
                  </xsl:for-each>
                </td>
                <td>
                  <xsl:choose>
                    <xsl:when test="s:lastmod">
                      <xsl:value-of select="s:lastmod"/>
                    </xsl:when>
                    <xsl:otherwise>
                      -
                    </xsl:otherwise>
                  </xsl:choose>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </div>
    </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
