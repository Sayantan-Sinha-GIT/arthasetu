// native fetch is global in Node 18+

async function checkCSS() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  // Find all stylesheet links or style tags
  const cssMatches = html.match(/href="(\/_next\/static\/css\/[^"]+)"/g);
  console.log('CSS links found in HTML:', cssMatches);
  
  if (cssMatches) {
    for (const m of cssMatches) {
      const href = m.replace('href="', '').replace('"', '');
      const cssRes = await fetch(`http://localhost:3000${href}`);
      const css = await cssRes.text();
      console.log(`CSS file ${href} (${css.length} chars):`);
      
      const hasForeground = css.includes('text-foreground') || css.includes('--color-foreground');
      const hasMuted = css.includes('text-muted') || css.includes('--color-muted');
      console.log('  has foreground:', hasForeground);
      console.log('  has muted:', hasMuted);
    }
  }
}

checkCSS().catch(console.error);
