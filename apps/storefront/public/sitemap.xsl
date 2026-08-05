<?xml version="1.0" encoding="UTF-8"?>
<!--
  Human-readable view for /sitemap.xml.

  Referenced by the <?xml-stylesheet?> instruction in app/sitemap.xml/route.ts.
  Browsers apply it; crawlers ignore processing instructions, so this file has
  no effect on how Google, Bing or any other bot reads the sitemap. It exists
  purely so that opening the sitemap in a tab shows a table instead of an
  unstyled run-on wall of URLs.

  XSLT 1.0 — that is the only version browsers implement. No xsl:function,
  no xsl:for-each-group, no sequence types.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  exclude-result-prefixes="s xhtml">

  <xsl:output method="html" version="5" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <!-- The sitemap is not a page for humans to find in search. -->
        <meta name="robots" content="noindex"/>
        <title>Yala Haji — XML Sitemap</title>
        <style>
          :root {
            --green: #0B5138;
            --green-tint: #EAF2EE;
            --ink: #16211C;
            --muted: #667069;
            --line: #E2E7E4;
            --bg: #F7F9F8;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0 0 4rem;
            background: var(--bg);
            color: var(--ink);
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont,
                         'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
          }
          header {
            background: var(--green);
            color: #fff;
            padding: 2rem 1.5rem;
          }
          .wrap { max-width: 1200px; margin: 0 auto; }
          h1 { margin: 0 0 .35rem; font-size: 1.5rem; font-weight: 700; }
          .sub { margin: 0; opacity: .8; font-size: .875rem; }
          .note {
            max-width: 1200px;
            margin: 1.5rem auto 1rem;
            padding: .75rem 1rem;
            background: var(--green-tint);
            border: 1px solid var(--line);
            border-radius: 8px;
            color: var(--green);
            font-size: .8125rem;
          }
          .card {
            max-width: 1200px;
            margin: 0 auto;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 10px;
            overflow: hidden;
          }
          table { width: 100%; border-collapse: collapse; }
          th {
            text-align: left;
            font-size: .6875rem;
            letter-spacing: .06em;
            text-transform: uppercase;
            color: var(--muted);
            background: #fbfcfc;
            padding: .75rem 1rem;
            border-bottom: 1px solid var(--line);
            white-space: nowrap;
          }
          td {
            padding: .7rem 1rem;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
          }
          tr:last-child td { border-bottom: 0; }
          tr:hover td { background: #fafbfb; }
          td.num { color: var(--muted); font-variant-numeric: tabular-nums; width: 3.5rem; }
          a { color: var(--green); text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          .langs { margin-top: .3rem; display: flex; flex-wrap: wrap; gap: .3rem; }
          .tag {
            display: inline-block;
            padding: .05rem .4rem;
            border: 1px solid var(--line);
            border-radius: 999px;
            font-size: .6875rem;
            color: var(--muted);
            background: #fff;
          }
          .meta { color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
          @media (max-width: 720px) {
            .hide-sm { display: none; }
            .note, .card { margin-left: .75rem; margin-right: .75rem; }
          }
        </style>
      </head>
      <body>
        <header>
          <div class="wrap">
            <h1>XML Sitemap</h1>
            <p class="sub">
              <xsl:value-of select="count(s:urlset/s:url)"/>
              <xsl:text> URLs · yalahaji.com</xsl:text>
            </p>
          </div>
        </header>

        <p class="note">
          This is a valid XML sitemap for search engines. The table below is a
          stylesheet applied by your browser — crawlers read the raw XML.
        </p>

        <div class="card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>URL</th>
                <th class="hide-sm">Last modified</th>
                <th class="hide-sm">Frequency</th>
                <th class="hide-sm">Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td class="num"><xsl:value-of select="position()"/></td>
                  <td>
                    <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
                    <xsl:if test="xhtml:link">
                      <div class="langs">
                        <xsl:for-each select="xhtml:link">
                          <span class="tag"><xsl:value-of select="@hreflang"/></span>
                        </xsl:for-each>
                      </div>
                    </xsl:if>
                  </td>
                  <!-- Trim the ISO timestamp to the date; the clock time is noise here. -->
                  <td class="meta hide-sm"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                  <td class="meta hide-sm"><xsl:value-of select="s:changefreq"/></td>
                  <td class="meta hide-sm"><xsl:value-of select="s:priority"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
