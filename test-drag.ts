import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  const page = await browser.newPage();

  // Listen for console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Drag') || text.includes('Pointer') || text.includes('Hotspot') || text.includes('targetNodeId') || text.includes('current:')) {
      console.log('BROWSER:', text);
    }
  });

  // Go to simulation-v2 page
  await page.goto('http://localhost:3000/simulation-v2?lang=ru', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000);

  // Check if we're on auth page
  const authForm = await page.$('input[type="password"]');
  if (authForm) {
    console.log('On auth page, logging in...');
    await page.type('input[placeholder="admin"]', 'admin');
    await page.type('input[placeholder="********"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto('http://localhost:3000/simulation-v2?lang=ru', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
  }

  // Add screens if none exists
  const addScreenBtn = await page.$('button:has-text("Добавить экран")');
  if (addScreenBtn) {
    console.log('Adding first screen...');
    await addScreenBtn.click();
    await page.waitForTimeout(500);
    console.log('Adding second screen...');
    await addScreenBtn.click();
    await page.waitForTimeout(500);
  }

  // Enable draw mode
  const drawBtn = await page.$('button:has-text("Рисование зон")');
  if (drawBtn) {
    console.log('Enabling draw mode...');
    await drawBtn.click();
    await page.waitForTimeout(500);
  }

  // Click on first screen to select it
  const screens = await page.$$('[data-id]');
  console.log('Found screens:', screens.length);
  
  if (screens.length >= 1) {
    console.log('Clicking first screen...');
    await screens[0].click();
    await page.waitForTimeout(300);
  }

  // Draw a hotspot on the first screen
  const canvas = await page.$('.react-flow__viewport');
  if (canvas) {
    const box = await canvas.boundingBox();
    if (box) {
      console.log('Drawing hotspot...');
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }

  // Disable draw mode
  const drawBtn2 = await page.$('button:has-text("Рисование зон")');
  if (drawBtn2) {
    console.log('Disabling draw mode...');
    await drawBtn2.click();
    await page.waitForTimeout(500);
  }

  // Now try to drag hotspot to second screen
  const hotspots = await page.$$('[class*="hotspot"]');
  console.log('Found hotspots:', hotspots.length);

  if (hotspots.length > 0 && screens.length >= 2) {
    const hotspot = hotspots[0];
    const targetScreen = screens[1];
    
    const hotspotBox = await hotspot.boundingBox();
    const targetBox = await targetScreen.boundingBox();
    
    if (hotspotBox && targetBox) {
      console.log('Dragging hotspot...');
      
      const startX = hotspotBox.x + hotspotBox.width / 2;
      const startY = hotspotBox.y + hotspotBox.height / 2;
      const endX = targetBox.x + targetBox.width / 2;
      const endY = targetBox.y + targetBox.height / 2;
      
      console.log('Start:', startX, startY);
      console.log('End:', endX, endY);
      
      await page.mouse.move(startX, startY);
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(endX, endY, { steps: 20 });
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(1000);
    }
  }

  console.log('Test complete. Check browser console for logs.');
  await page.waitForTimeout(5000);
  
  await browser.close();
}

test().catch(console.error);
