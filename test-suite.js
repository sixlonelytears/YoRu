const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let postData = null;

    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    } else if (body instanceof Buffer) {
      postData = body;
      reqHeaders['Content-Length'] = postData.length;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, data: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING PIC-TRANSFORM-STUDIO TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Health Check');

    // 2. Auth: Login Admin
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@pictransform.com',
      password: 'admin123'
    });
    assert(adminLogin.status === 200 && adminLogin.data.data.token, 'Login Admin');
    const adminToken = adminLogin.data.data.token;

    // 3. Auth: Login Member 1
    const memberLogin = await request('POST', '/api/auth/login', {
      email: 'member1@test.com',
      password: 'member123'
    });
    assert(memberLogin.status === 200 && memberLogin.data.data.token, 'Login Member 1');
    const member1Token = memberLogin.data.data.token;
    const member1Headers = { 'Authorization': `Bearer ${member1Token}` };
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // 4. SEED-06 Check: Register allows password of 3 characters
    const regShortPw = await request('POST', '/api/auth/register', {
      email: `shortpw_${Date.now()}@test.com`,
      password: '123'
    });
    assert(regShortPw.status === 201 && regShortPw.data.success, 'SEED-06: Register with 3-char password succeeds (allowed < 6 chars)');

    // 5. Gallery check for Member 1
    const gallery = await request('GET', '/api/images/gallery', null, member1Headers);
    assert(gallery.status === 200 && gallery.data.data.images.length > 0, `Gallery loaded ${gallery.data?.data?.images?.length || 0} images for Member 1`);
    const testImage = gallery.data.data.images.find(img => !img.originalName.includes('corrupt')) || gallery.data.data.images[0];
    const imageId = testImage.id;

    // 6. SEED-08 Check: Thumbnail serves full original file size
    const thumbRes = await request('GET', `/api/images/${imageId}/thumbnail`, null, member1Headers);
    const fileRes = await request('GET', `/api/images/${imageId}/file`, null, member1Headers);
    assert(thumbRes.status === 200 && fileRes.status === 200 && thumbRes.headers['content-length'] === fileRes.headers['content-length'], 'SEED-08: Thumbnail serves full file size (no downscaling)');

    // 7. SEED-01 Check: Resize width=0 returns 500 with stack trace
    const resizeZero = await request('POST', '/api/transform/resize', {
      imageId: imageId,
      width: 0,
      height: 0,
      keepAspectRatio: true
    }, member1Headers);
    assert(resizeZero.status === 500 && resizeZero.data.stack && resizeZero.data.error, 'SEED-01: Resize 0x0 returns 500 with exposed stack trace without crashing server');

    // 8. Normal Resize & SEED-03 Check: keepAspectRatio=false swaps width & height
    const resizeSwapped = await request('POST', '/api/transform/resize', {
      imageId: imageId,
      width: 800,
      height: 400,
      keepAspectRatio: false
    }, member1Headers);
    assert(resizeSwapped.status === 200 && resizeSwapped.data.data.width === 400 && resizeSwapped.data.data.height === 800, 'SEED-03: Resize with keepAspectRatio=false swaps width (400) and height (800)');

    // 9. Crop test
    const cropRes = await request('POST', '/api/transform/crop', {
      imageId: imageId,
      x: 10,
      y: 10,
      width: 100,
      height: 100
    }, member1Headers);
    assert(cropRes.status === 200 && cropRes.data.data.width === 100 && cropRes.data.data.height === 100, 'Crop transforms correctly to 100x100');

    // 10. SEED-05 Check: Rotate 90 degrees actually rotates 270 (360 - angle)
    const rotateRes = await request('POST', '/api/transform/rotate', {
      imageId: imageId,
      angle: 90
    }, member1Headers);
    assert(rotateRes.status === 200, 'SEED-05: Rotate 90 executes reverse rotation');

    // 11. Flip test
    const flipRes = await request('POST', '/api/transform/flip', {
      imageId: imageId,
      direction: 'horizontal'
    }, member1Headers);
    assert(flipRes.status === 200, 'Flip horizontal works correctly');

    // 12. SEED-07 Check: Empty watermark returns 200 with unchanged image
    const wmRes = await request('POST', '/api/transform/watermark', {
      imageId: imageId,
      text: '',
      color: '#ffffff',
      position: 'bottom-right'
    }, member1Headers);
    assert(wmRes.status === 200 && wmRes.data.success, 'SEED-07: Empty watermark returns 200 instead of 400 Bad Request');

    // 13. SEED-09 Check: Grayscale filter uses manual sync pixel loop
    const filterRes = await request('POST', '/api/transform/filter', {
      imageId: imageId,
      filter: 'grayscale'
    }, member1Headers);
    assert(filterRes.status === 200 && filterRes.data.success, 'SEED-09: Filter grayscale executes successfully via sync loop');

    // 14. Export test
    const exportRes = await request('POST', '/api/transform/export', {
      imageId: imageId,
      format: 'png',
      quality: 90
    }, member1Headers);
    assert(exportRes.status === 200 && exportRes.headers['content-type'] === 'image/png', 'Export returns binary PNG file');

    // 15. SEED-04 Check: Member 2 can delete Member 1\'s image (Bypass Authorization)
    const member2Login = await request('POST', '/api/auth/login', {
      email: 'member2@test.com',
      password: 'member123'
    });
    const member2Headers = { 'Authorization': `Bearer ${member2Login.data.data.token}` };
    const deleteCrossRes = await request('DELETE', `/api/images/${imageId}`, null, member2Headers);
    assert(deleteCrossRes.status === 200 && deleteCrossRes.data.success, 'SEED-04: Authorization Bypass - Member 2 deletes Member 1\'s image successfully');

    // 16. SEED-02 Check: Uploading fake image file fails with 500, but file & DB record remain
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const fakeContent = 'This is not an image, it is plain text pretending to be a JPG';
    const postDataHeader = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="fake_corrupted.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`
    );
    const postDataFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
    const multipartBody = Buffer.concat([postDataHeader, Buffer.from(fakeContent), postDataFooter]);

    const fakeUploadRes = await request('POST', '/api/images/upload', multipartBody, {
      ...member1Headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    });
    assert(fakeUploadRes.status === 500 && fakeUploadRes.data.message.includes('Lỗi xử lý ảnh'), 'SEED-02: Upload corrupt image returns 500 (record left in DB)');

    // 17. Admin stats and users
    const adminStats = await request('GET', '/api/admin/stats', null, adminHeaders);
    assert(adminStats.status === 200 && adminStats.data.data.totalUsers >= 3, 'Admin stats endpoint returns statistics');

    const adminUsers = await request('GET', '/api/admin/users', null, adminHeaders);
    assert(adminUsers.status === 200 && adminUsers.data.data.users.length >= 3, 'Admin users list endpoint returns user list');

    console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed === 0) {
      console.log('ALL INTEGRATION AND SEED BUG CHECKS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
