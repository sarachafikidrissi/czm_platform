#!/bin/bash
echo "🔄 Syncing ONLY changed folders to live site..."

cd public_html

# 1. Backend - PHP Files
echo "📁 Syncing app/..."
cp -r ./czm_platform/app/* app/

echo "📁 Syncing bootstrap/..."
cp -r ./czm_platform/bootstrap/* bootstrap/

echo "📁 Syncing config/..."
cp -r ./czm_platform/config/* config/

# 2. Database Files
echo "📁 Syncing database/..."
cp -r ./czm_platform/database/* database/

# 3. Frontend Source Files
echo "📁 Syncing resources/..."
cp -r ./czm_platform/resources/* resources/

# 4. Routes
echo "📁 Syncing routes/..."
cp -r ./czm_platform/routes/* routes/

# 5. Public Assets
echo "📁 Syncing public/images/..."
cp -r ./czm_platform/public/images/* public/images/



echo "✅ All changed folders synced!"