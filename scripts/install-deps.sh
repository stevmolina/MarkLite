#!/usr/bin/env bash
#
# Install system dependencies required to build MarkLite (Tauri v2).
# Usage: ./scripts/install-deps.sh
#
set -euo pipefail

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "${ID}"
    elif command -v sw_vers &>/dev/null; then
        echo "macos"
    elif [[ "$OSTYPE" == msys* || "$OSTYPE" == cygwin* ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

DISTRO=$(detect_distro)

echo "Detected platform: ${DISTRO}"
echo ""

case "${DISTRO}" in
    ubuntu|debian|pop|linuxmint|elementary|zorin)
        echo "Installing dependencies via apt..."
        sudo apt update
        sudo apt install -y \
            libwebkit2gtk-4.1-dev \
            libgtk-3-dev \
            libappindicator3-dev \
            librsvg2-dev \
            pango1.0-tools \
            pkg-config \
            build-essential \
            curl \
            wget \
            file
        ;;
    fedora|nobara)
        echo "Installing dependencies via dnf..."
        sudo dnf install -y \
            gtk3-devel \
            webkit2gtk4.1-devel \
            libappindicator-gtk3-devel \
            librsvg2-devel \
            pango-devel \
            pkg-config \
            gcc \
            gcc-c++ \
            curl \
            wget \
            file
        ;;
    arch|manjaro|endeavouros)
        echo "Installing dependencies via pacman..."
        sudo pacman -S --needed --noconfirm \
            webkit2gtk-4.1 \
            gtk3 \
            libappindicator-gtk3 \
            librsvg \
            pango \
            pkgconf \
            base-devel \
            curl \
            wget \
            file
        ;;
    opensuse*|suse*)
        echo "Installing dependencies via zypper..."
        sudo zypper install -y \
            webkit2gtk3-devel \
            gtk3-devel \
            libappindicator3-devel \
            librsvg-devel \
            pango-devel \
            pkg-config \
            gcc \
            gcc-c++ \
            curl \
            wget \
            file
        ;;
    macos)
        echo "macOS detected. WebKit is built-in."
        if ! xcode-select -p &>/dev/null; then
            echo "Installing Xcode Command Line Tools..."
            xcode-select --install
        else
            echo "Xcode Command Line Tools already installed."
        fi
        ;;
    windows)
        echo "Windows detected."
        echo "Please ensure the following are installed manually:"
        echo "  1. Microsoft Visual Studio C++ Build Tools"
        echo "     https://visualstudio.microsoft.com/visual-cpp-build-tools/"
        echo "  2. WebView2 Runtime"
        echo "     https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
        exit 0
        ;;
    *)
        echo "Unsupported or unrecognized distribution: ${DISTRO}"
        echo ""
        echo "You need to install the following system libraries manually:"
        echo "  - GTK 3 development headers"
        echo "  - WebKit2GTK 4.1 development headers"
        echo "  - libappindicator3 development headers"
        echo "  - librsvg2 development headers"
        echo "  - pango development headers"
        echo "  - pkg-config"
        echo ""
        echo "Refer to the Tauri prerequisites:"
        echo "  https://v2.tauri.app/start/prerequisites/"
        exit 1
        ;;
esac

echo ""
echo "System dependencies installed successfully."
