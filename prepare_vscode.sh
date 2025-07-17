#!/usr/bin/env bash
# shellcheck disable=SC1091,2154

set -e

# include common functions
. ./utils.sh

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  cp -rp src/insider/* vscode/
else
  cp -rp src/stable/* vscode/
fi

cp -f LICENSE vscode/LICENSE.txt

cd vscode || { echo "'vscode' dir not found"; exit 1; }

../update_settings.sh

# apply patches
{ set +x; } 2>/dev/null

echo "APP_NAME=\"${APP_NAME}\""
echo "APP_NAME_LC=\"${APP_NAME_LC}\""
echo "BINARY_NAME=\"${BINARY_NAME}\""
echo "GH_REPO_PATH=\"${GH_REPO_PATH}\""
echo "ORG_NAME=\"${ORG_NAME}\""

for file in ../patches/*.patch; do
  if [[ -f "${file}" ]]; then
    apply_patch "${file}"
  fi
done

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  for file in ../patches/insider/*.patch; do
    if [[ -f "${file}" ]]; then
      apply_patch "${file}"
    fi
  done
fi

if [[ -d "../patches/${OS_NAME}/" ]]; then
  for file in "../patches/${OS_NAME}/"*.patch; do
    if [[ -f "${file}" ]]; then
      apply_patch "${file}"
    fi
  done
fi

for file in ../patches/user/*.patch; do
  if [[ -f "${file}" ]]; then
    apply_patch "${file}"
  fi
done

set -x

export ELECTRON_SKIP_BINARY_DOWNLOAD=1
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

if [[ "${OS_NAME}" == "linux" ]]; then
  export VSCODE_SKIP_NODE_VERSION_CHECK=1

   if [[ "${npm_config_arch}" == "arm" ]]; then
    export npm_config_arm_version=7
  fi
elif [[ "${OS_NAME}" == "windows" ]]; then
  if [[ "${npm_config_arch}" == "arm" ]]; then
    export npm_config_arm_version=7
  fi
else
  if [[ "${CI_BUILD}" != "no" ]]; then
    clang++ --version
  fi
fi

mv .npmrc .npmrc.bak
cp ../npmrc .npmrc

for i in {1..5}; do # try 5 times
  if [[ "${CI_BUILD}" != "no" && "${OS_NAME}" == "osx" ]]; then
    CXX=clang++ npm ci && break
  else
    npm ci && break
  fi

  if [[ $i == 3 ]]; then
    echo "Npm install failed too many times" >&2
    exit 1
  fi
  echo "Npm install failed $i, trying again..."

  sleep $(( 15 * (i + 1)))
done

mv .npmrc.bak .npmrc

setpath() {
  local jsonTmp
  { set +x; } 2>/dev/null
  jsonTmp=$( jq --arg 'path' "${2}" --arg 'value' "${3}" 'setpath([$path]; $value)' "${1}.json" )
  echo "${jsonTmp}" > "${1}.json"
  set -x
}

setpath_json() {
  local jsonTmp
  { set +x; } 2>/dev/null
  jsonTmp=$( jq --arg 'path' "${2}" --argjson 'value' "${3}" 'setpath([$path]; $value)' "${1}.json" )
  echo "${jsonTmp}" > "${1}.json"
  set -x
}

# product.json
cp product.json{,.bak}

setpath "product" "checksumFailMoreInfoUrl" "https://go.microsoft.com/fwlink/?LinkId=828886"
setpath "product" "documentationUrl" "https://go.microsoft.com/fwlink/?LinkID=533484#vscode"
setpath_json "product" "extensionsGallery" '{"serviceUrl": "https://open-vsx.org/vscode/gallery", "itemUrl": "https://open-vsx.org/vscode/item", "extensionUrlTemplate": "https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest", "controlUrl": "https://raw.githubusercontent.com/EclipseFdn/publish-extensions/refs/heads/master/extension-control/extensions.json"}'
setpath "product" "introductoryVideosUrl" "https://go.microsoft.com/fwlink/?linkid=832146"
setpath "product" "keyboardShortcutsUrlLinux" "https://go.microsoft.com/fwlink/?linkid=832144"
setpath "product" "keyboardShortcutsUrlMac" "https://go.microsoft.com/fwlink/?linkid=832143"
setpath "product" "keyboardShortcutsUrlWin" "https://go.microsoft.com/fwlink/?linkid=832145"
setpath "product" "licenseUrl" "https://github.com/troubleshoot-dev/troubleshoot-dev/blob/master/LICENSE"
setpath_json "product" "linkProtectionTrustedDomains" '["https://open-vsx.org"]'
setpath "product" "releaseNotesUrl" "https://go.microsoft.com/fwlink/?LinkID=533483#vscode"
setpath "product" "reportIssueUrl" "https://github.com/troubleshoot-dev/troubleshoot-dev/issues/new"
setpath "product" "requestFeatureUrl" "https://go.microsoft.com/fwlink/?LinkID=533482"
setpath "product" "tipsAndTricksUrl" "https://go.microsoft.com/fwlink/?linkid=852118"
setpath "product" "twitterUrl" "https://go.microsoft.com/fwlink/?LinkID=533687"

if [[ "${DISABLE_UPDATE}" != "yes" ]]; then
  setpath "product" "updateUrl" "https://raw.githubusercontent.com/troubleshoot-dev/versions/refs/heads/master"

  setpath "product" "downloadUrl" "https://github.com/troubleshoot-dev/troubleshoot-dev/releases"
fi

setpath "product" "nameShort" "troubleshoot.dev"
setpath "product" "nameLong" "troubleshoot.dev"
setpath "product" "applicationName" "troubleshoot-dev"
setpath "product" "linuxIconName" "troubleshoot-dev"
setpath "product" "quality" "stable"
setpath "product" "urlProtocol" "troubleshoot-dev"
setpath "product" "serverApplicationName" "troubleshoot-dev-server"
setpath "product" "serverDataFolderName" ".troubleshoot-dev-server"
setpath "product" "darwinBundleIdentifier" "dev.troubleshoot"
setpath "product" "win32AppUserModelId" "troubleshoot.dev.troubleshoot-dev"
setpath "product" "win32DirName" "troubleshoot.dev"
setpath "product" "win32MutexName" "troubleshoot-dev"
setpath "product" "win32NameVersion" "troubleshoot.dev"
setpath "product" "win32RegValueName" "troubleshoot-dev"
setpath "product" "win32ShellNameShort" "troubleshoot.dev"
setpath "product" "win32AppId" "{{A63CBF88-25C6-4B10-952F-326AE657F16C}"
setpath "product" "win32x64AppId" "{{B8DA3577-054F-4CA1-8122-7D820494CFFC}"
setpath "product" "win32arm64AppId" "{{C7DEE444-3D04-4258-B92A-BC1F0FF2CAE5}"
setpath "product" "win32UserAppId" "{{DFD05EB4-651E-4E78-A062-515204B47A3B}"
setpath "product" "win32x64UserAppId" "{{E1F05D1-C245-4562-81EE-28188DB6FD18}"
setpath "product" "win32arm64UserAppId" "{{F7FD70A5-1B8D-4875-9F40-C5553F094829}"
setpath "product" "tunnelApplicationName" "troubleshoot-dev-tunnel"
setpath "product" "win32TunnelServiceMutex" "troubleshoot-dev-tunnelservice"
setpath "product" "win32TunnelMutex" "troubleshoot-dev-tunnel"

jsonTmp=$( jq -s '.[0] * .[1]' product.json ../product.json )
echo "${jsonTmp}" > product.json && unset jsonTmp

cat product.json

# package.json
cp package.json{,.bak}

setpath "package" "version" "${RELEASE_VERSION%-insider}"

replace 's|Microsoft Corporation|troubleshoot.dev|' package.json

cp resources/server/manifest.json{,.bak}

setpath "resources/server/manifest" "name" "troubleshoot.dev"
setpath "resources/server/manifest" "short_name" "troubleshoot.dev"

# announcements
replace "s|\\[\\/\\* BUILTIN_ANNOUNCEMENTS \\*\\/\\]|$( tr -d '\n' < ../announcements-builtin.json )|" src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts

../undo_telemetry.sh

replace 's|Microsoft Corporation|troubleshoot.dev|' build/lib/electron.js
replace 's|Microsoft Corporation|troubleshoot.dev|' build/lib/electron.ts
replace 's|([0-9]) Microsoft|\1 troubleshoot.dev|' build/lib/electron.js
replace 's|([0-9]) Microsoft|\1 troubleshoot.dev|' build/lib/electron.ts

if [[ "${OS_NAME}" == "linux" ]]; then
  # microsoft adds their apt repo to sources
  # unless the app name is code-oss
  # as we are renaming the application to troubleshoot-dev
  # we need to edit a line in the post install template
  sed -i "s/code-oss/troubleshoot-dev/" resources/linux/debian/postinst.template

  # fix the packages metadata
  # code.appdata.xml
  sed -i 's|Visual Studio Code|troubleshoot.dev|g' resources/linux/code.appdata.xml
  sed -i 's|https://code.visualstudio.com/docs/setup/linux|https://github.com/troubleshoot-dev/troubleshoot-dev#download-install|' resources/linux/code.appdata.xml
  sed -i 's|https://code.visualstudio.com/home/home-screenshot-linux-lg.png|https://troubleshoot.dev/img/troubleshoot-dev.png|' resources/linux/code.appdata.xml
  sed -i 's|https://code.visualstudio.com|https://troubleshoot.dev|' resources/linux/code.appdata.xml

  # control.template
  sed -i 's|Microsoft Corporation <vscode-linux@microsoft.com>|troubleshoot.dev Team https://github.com/troubleshoot-dev/troubleshoot-dev/graphs/contributors|'  resources/linux/debian/control.template
  sed -i 's|Visual Studio Code|troubleshoot.dev|g' resources/linux/debian/control.template
  sed -i 's|https://code.visualstudio.com/docs/setup/linux|https://github.com/troubleshoot-dev/troubleshoot-dev#download-install|' resources/linux/debian/control.template
  sed -i 's|https://code.visualstudio.com|https://troubleshoot.dev|' resources/linux/debian/control.template

  # code.spec.template
  sed -i 's|Microsoft Corporation|troubleshoot.dev Team|' resources/linux/rpm/code.spec.template
  sed -i 's|Visual Studio Code Team <vscode-linux@microsoft.com>|troubleshoot.dev Team https://github.com/troubleshoot-dev/troubleshoot-dev/graphs/contributors|' resources/linux/rpm/code.spec.template
  sed -i 's|Visual Studio Code|troubleshoot.dev|' resources/linux/rpm/code.spec.template
  sed -i 's|https://code.visualstudio.com/docs/setup/linux|https://github.com/troubleshoot-dev/troubleshoot-dev#download-install|' resources/linux/rpm/code.spec.template
  sed -i 's|https://code.visualstudio.com|https://troubleshoot.dev|' resources/linux/rpm/code.spec.template

  # snapcraft.yaml
  sed -i 's|Visual Studio Code|troubleshoot.dev|'  resources/linux/rpm/code.spec.template
elif [[ "${OS_NAME}" == "windows" ]]; then
  # code.iss
  sed -i 's|https://code.visualstudio.com|https://troubleshoot.dev|' build/win32/code.iss
  sed -i 's|Microsoft Corporation|troubleshoot.dev|' build/win32/code.iss
fi

cd ..
