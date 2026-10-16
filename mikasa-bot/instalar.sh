#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
#  🤖 MIKASA BOT — INSTALADOR AUTOMÁTICO (Termux / Android)
#  Uso:        bash instalar.sh
#  Opções:     bash instalar.sh --iniciar    (instala e já liga o bot)
#              bash instalar.sh --limpo      (apaga node_modules e reinstala tudo)
#
#  O que ele faz, sozinho e sem perguntar nada:
#   1) atualiza o Termux                     6) instala os módulos do Node (npm)
#   2) instala Node.js, ffmpeg, yt-dlp...    7) confere cada módulo, um por um
#   3) confere a versão do Node              8) cria as pastas que o bot usa
#   4) libera acesso ao armazenamento        9) testa tudo e mostra um relatório
#   5) prepara Python / webp / imagemagick
#  Pode rodar de novo quantas vezes quiser: ele só instala o que falta.
#  Registro completo da instalação: instalacao.log
# =============================================================================

set -u
cd "$(dirname "$0")" || exit 1
PASTA="$(pwd)"
LOG="$PASTA/instalacao.log"
: > "$LOG"

export DEBIAN_FRONTEND=noninteractive
export npm_config_loglevel=error npm_config_update_notifier=false

INICIAR=0; LIMPO=0
for a in "$@"; do
  case "$a" in
    --iniciar) INICIAR=1 ;;
    --limpo)   LIMPO=1 ;;
  esac
done

# ---------- visual ----------
if [ -t 1 ]; then
  R=$'\033[0;31m'; G=$'\033[0;32m'; Y=$'\033[0;33m'; C=$'\033[0;36m'; M=$'\033[0;35m'; B=$'\033[1m'; N=$'\033[0m'
else
  R=; G=; Y=; C=; M=; B=; N=
fi
TOTAL=9; PASSO=0
FALHAS=()
AVISOS=()

linha()  { printf "${M}%s${N}\n" "══════════════════════════════════════════════════"; }
passo()  { PASSO=$((PASSO+1)); echo; linha; printf "${B}${C}[%d/%d] %s${N}\n" "$PASSO" "$TOTAL" "$1"; linha; }
ok()     { printf "  ${G}✔${N} %s\n" "$1"; }
info()   { printf "  ${C}•${N} %s\n" "$1"; }
aviso()  { printf "  ${Y}⚠${N} %s\n" "$1"; AVISOS+=("$1"); }
erro()   { printf "  ${R}✘${N} %s\n" "$1"; FALHAS+=("$1"); }
log()    { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG"; }

# roda um comando escondendo a saída (vai pro log) e mostra um spinner
rodar() {
  local msg="$1"; shift
  log "\$ $*"
  ( "$@" >> "$LOG" 2>&1 ) &
  local pid=$! i=0 s='|/-\'
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${C}%s${N} %s " "${s:i++%4:1}" "$msg"
    sleep 0.2
  done
  wait "$pid"; local rc=$?
  printf "\r\033[K"
  return $rc
}

# tenta de novo até N vezes (internet de celular falha)
tentar() {
  local n="$1" msg="$2"; shift 2
  local t=1
  while [ "$t" -le "$n" ]; do
    if rodar "$msg (tentativa $t/$n)" "$@"; then return 0; fi
    t=$((t+1)); sleep 3
  done
  return 1
}

tem() { command -v "$1" >/dev/null 2>&1; }

clear 2>/dev/null
linha
printf "${B}${M}      🌹  MIKASA BOT — INSTALAÇÃO AUTOMÁTICA  🌹${N}\n"
linha
info "Pasta do bot: $PASTA"
info "Registro: $LOG"

# ---------- ambiente ----------
EH_TERMUX=0
if [ -n "${PREFIX:-}" ] && echo "$PREFIX" | grep -q "com.termux"; then EH_TERMUX=1; fi
if [ "$EH_TERMUX" -eq 1 ]; then
  ok "Termux detectado"
else
  aviso "Não parece ser o Termux. Vou tentar mesmo assim (apt/pkg podem não existir)."
fi

# =============================================================================
passo "Atualizando o Termux"
# =============================================================================
if [ "$EH_TERMUX" -eq 1 ]; then
  if ! ping -c1 -W3 8.8.8.8 >/dev/null 2>&1 && ! ping -c1 -W3 google.com >/dev/null 2>&1; then
    erro "Sem internet. Conecte no Wi-Fi/dados e rode de novo."
    echo; exit 1
  fi
  ok "Internet funcionando"
  rodar "Atualizando lista de pacotes" pkg update -y -o Dpkg::Options::="--force-confold" || aviso "pkg update falhou (talvez o espelho esteja fora). Tentando seguir."
  rodar "Atualizando pacotes instalados" pkg upgrade -y -o Dpkg::Options::="--force-confold" || aviso "pkg upgrade falhou. Tentando seguir."
  ok "Termux atualizado"
else
  info "Pulando (não é Termux)"
fi

# =============================================================================
passo "Instalando programas necessários"
# =============================================================================
# comando | pacote do Termux | para que serve
PROGRAMAS=(
  "node|nodejs-lts|Node.js (roda o bot)"
  "npm|nodejs-lts|npm (instala os módulos)"
  "git|git|Git"
  "ffmpeg|ffmpeg|ffmpeg (música, vídeo, figurinha, áudio)"
  "python|python|Python (usado pelo yt-dlp)"
  "yt-dlp|yt-dlp|yt-dlp (baixar música e vídeo)"
  "convert|imagemagick|ImageMagick (imagens e figurinhas)"
  "cwebp|libwebp|libwebp (figurinhas .webp)"
  "curl|curl|curl"
  "wget|wget|wget"
  "unzip|unzip|unzip"
  "zip|zip|zip"
  "clang|clang|compilador C (módulos nativos)"
  "make|make|make (módulos nativos)"
  "pkg-config|pkg-config|pkg-config"
)
if [ "$EH_TERMUX" -eq 1 ]; then
  for item in "${PROGRAMAS[@]}"; do
    IFS='|' read -r cmd pacote desc <<< "$item"
    if tem "$cmd"; then
      ok "$desc — já instalado"
    else
      if tentar 3 "Instalando $desc" pkg install -y "$pacote"; then
        ok "$desc — instalado"
      else
        # nodejs-lts às vezes não existe no espelho: tenta o nodejs normal
        if [ "$pacote" = "nodejs-lts" ] && tentar 2 "Instalando nodejs (versão atual)" pkg install -y nodejs; then
          ok "$desc — instalado (nodejs)"
        elif [ "$cmd" = "yt-dlp" ] && tem pip && tentar 2 "Instalando yt-dlp pelo pip" pip install -U yt-dlp; then
          ok "yt-dlp — instalado pelo pip"
        else
          case "$cmd" in
            node|npm|ffmpeg|yt-dlp) erro "$desc — NÃO consegui instalar (essencial)" ;;
            *)                      aviso "$desc — não instalou (o bot roda, mas algo pode ficar limitado)" ;;
          esac
        fi
      fi
    fi
  done
  # yt-dlp: mantém atualizado (o YouTube muda toda hora)
  if tem pip; then
    rodar "Atualizando yt-dlp" pip install -U yt-dlp --break-system-packages || rodar "Atualizando yt-dlp" pip install -U yt-dlp || true
  fi
else
  for item in "${PROGRAMAS[@]}"; do
    IFS='|' read -r cmd pacote desc <<< "$item"
    if tem "$cmd"; then ok "$desc"; else
      case "$cmd" in node|npm|ffmpeg|yt-dlp) erro "$desc não encontrado — instale manualmente" ;; *) aviso "$desc não encontrado" ;; esac
    fi
  done
fi

# =============================================================================
passo "Conferindo a versão do Node.js"
# =============================================================================
if tem node; then
  NODE_V="$(node -v 2>/dev/null | sed 's/^v//')"
  NODE_MAJOR="${NODE_V%%.*}"
  if [ "${NODE_MAJOR:-0}" -ge 20 ] 2>/dev/null; then
    ok "Node.js $NODE_V (ok, precisa ser 20 ou maior)"
  else
    aviso "Node.js $NODE_V é antigo (o bot precisa do 20+). Tentando atualizar..."
    if [ "$EH_TERMUX" -eq 1 ] && tentar 2 "Atualizando Node.js" pkg install -y nodejs-lts; then
      NODE_V="$(node -v | sed 's/^v//')"; NODE_MAJOR="${NODE_V%%.*}"
      if [ "$NODE_MAJOR" -ge 20 ]; then ok "Node.js atualizado para $NODE_V"; else erro "Node.js continua antigo ($NODE_V). Atualize o Termux."; fi
    else
      erro "Não consegui atualizar o Node.js."
    fi
  fi
else
  erro "Node.js não está instalado."
fi

# =============================================================================
passo "Liberando acesso ao armazenamento"
# =============================================================================
if [ "$EH_TERMUX" -eq 1 ]; then
  if [ -d "$HOME/storage" ]; then
    ok "Armazenamento já liberado"
  elif tem termux-setup-storage; then
    info "Se aparecer um pedido de permissão na tela, toque em PERMITIR."
    termux-setup-storage >> "$LOG" 2>&1 || true
    sleep 3
    [ -d "$HOME/storage" ] && ok "Armazenamento liberado" || aviso "Não deu pra confirmar a permissão de armazenamento (não é obrigatória)."
  fi
else
  info "Pulando (não é Termux)"
fi

# =============================================================================
passo "Preparando Python e npm"
# =============================================================================
if tem pip; then ok "pip disponível"; else aviso "pip não encontrado"; fi
if tem npm; then
  rodar "Ajustando npm para internet instável" bash -c 'npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 10000 && npm config set fetch-retry-maxtimeout 60000 && npm config set audit false && npm config set fund false' || true
  ok "npm configurado ($(npm -v 2>/dev/null))"
fi

# =============================================================================
passo "Instalando os módulos do bot (npm)"
# =============================================================================
if [ ! -f package.json ]; then
  erro "package.json não encontrado — rode o instalador dentro da pasta do bot."
elif ! tem npm; then
  erro "npm indisponível, não dá pra instalar os módulos."
else
  if [ "$LIMPO" -eq 1 ]; then
    rodar "Apagando node_modules antigo" rm -rf node_modules || true
    ok "node_modules apagado (modo --limpo)"
  fi
  if tentar 3 "Instalando módulos (pode demorar alguns minutos)" npm install --no-audit --no-fund --legacy-peer-deps; then
    ok "npm install concluído"
  else
    aviso "npm install teve problemas. Vou conferir módulo por módulo e instalar o que faltar."
  fi
fi

# =============================================================================
passo "Conferindo cada módulo"
# =============================================================================
if tem node && [ -f package.json ]; then
  MODULOS="$(node -e 'const p=require("./package.json");console.log(Object.keys(p.dependencies||{}).join(" "))' 2>/dev/null)"
  for m in $MODULOS; do
    if node -e "require.resolve('$m')" >/dev/null 2>&1; then
      ok "$m"
    else
      if tentar 2 "Instalando $m separado" npm install "$m" --no-audit --no-fund --legacy-peer-deps; then
        ok "$m (instalado agora)"
      else
        erro "Módulo $m não instalou"
      fi
    fi
  done

  # teste de carga dos módulos que costumam dar dor de cabeça
  node -e "require('@whiskeysockets/baileys')" >/dev/null 2>&1 && ok "Baileys carrega" || erro "Baileys não carrega"
  if node -e "require('@napi-rs/canvas')" >/dev/null 2>&1; then
    ok "Canvas (cards e imagens) carrega"
  else
    aviso "Canvas não carregou. Tentando reinstalar..."
    if tentar 2 "Reinstalando @napi-rs/canvas" npm install @napi-rs/canvas --force --no-audit --no-fund && node -e "require('@napi-rs/canvas')" >/dev/null 2>&1; then
      ok "Canvas funcionando agora"
    else
      aviso "Canvas continua sem carregar: os cards (boas-vindas, menu) podem falhar. Veja $LOG."
    fi
  fi
fi

# =============================================================================
passo "Criando pastas e conferindo arquivos"
# =============================================================================
for d in database temp src/dados src/midias/audios src/midias/gifs src/midias/stickers src/midias/imagens src/midias/videos src/midias/sons \
         src/midias/audios/menu src/midias/audios/menupv src/midias/audios/entrada src/midias/audios/saida src/midias/audios/prefixo \
         src/midias/audios/bomdia src/midias/audios/boatarde src/midias/audios/boanoite src/midias/audios/antiamor; do
  mkdir -p "$d" 2>/dev/null
done
ok "Pastas de dados e mídias prontas"
[ -f config.js ] && ok "config.js encontrado" || erro "config.js não encontrado"
[ -f mikasabot.js ] && ok "mikasabot.js encontrado" || erro "mikasabot.js não encontrado"
if [ -d src ]; then
  QTD_MODULOS=$(find src -mindepth 2 -maxdepth 2 -name '*.js' 2>/dev/null | wc -l)
  ok "$QTD_MODULOS módulos na pasta src"
fi
# Validação de sintaxe do arquivo principal e de todos os módulos
if tem node; then
  SINTAXE=0
  while IFS= read -r arq; do
    node --check "$arq" >/dev/null 2>&1 || { erro "Erro de sintaxe em $arq"; SINTAXE=1; }
  done < <(find . -name '*.js' -not -path './node_modules/*' 2>/dev/null)
  [ "$SINTAXE" -eq 0 ] && ok "Todos os arquivos .js estão válidos"
fi

# =============================================================================
passo "Teste final"
# =============================================================================
printf "  %-12s %s\n" "Node.js"  "$(tem node && node -v || echo '— NÃO INSTALADO')"
printf "  %-12s %s\n" "npm"      "$(tem npm && npm -v || echo '— NÃO INSTALADO')"
printf "  %-12s %s\n" "ffmpeg"   "$(tem ffmpeg && ffmpeg -version 2>/dev/null | head -n1 | awk '{print $3}' || echo '— NÃO INSTALADO')"
printf "  %-12s %s\n" "yt-dlp"   "$(tem yt-dlp && yt-dlp --version 2>/dev/null || echo '— NÃO INSTALADO')"
printf "  %-12s %s\n" "Python"   "$(tem python && python --version 2>&1 | awk '{print $2}' || echo '— não instalado')"
printf "  %-12s %s\n" "ImageMagick" "$(tem convert && echo ok || echo '— não instalado')"
printf "  %-12s %s\n" "libwebp"  "$(tem cwebp && echo ok || echo '— não instalado')"

echo; linha
if [ "${#FALHAS[@]}" -eq 0 ]; then
  printf "${B}${G}  ✅ TUDO PRONTO! O Mikasa Bot está instalado.${N}\n"
else
  printf "${B}${R}  ❌ A instalação terminou com %d problema(s):${N}\n" "${#FALHAS[@]}"
  for f in "${FALHAS[@]}"; do printf "     ${R}•${N} %s\n" "$f"; done
  echo "  Rode de novo: bash instalar.sh   (ele só tenta o que falta)"
  echo "  Detalhes no arquivo: instalacao.log"
fi
if [ "${#AVISOS[@]}" -gt 0 ]; then
  printf "\n${Y}  Avisos (não impedem de usar):${N}\n"
  for a in "${AVISOS[@]}"; do printf "     ${Y}•${N} %s\n" "$a"; done
fi
linha
echo
printf "  ${B}Para ligar o bot:${N}  ${C}bash iniciar.sh${N}\n"
printf "  ${B}Primeira vez:${N} ele pede o número e mostra o código de pareamento.\n"
echo

if [ "$INICIAR" -eq 1 ] && [ "${#FALHAS[@]}" -eq 0 ]; then
  exec bash "$PASTA/iniciar.sh"
fi
[ "${#FALHAS[@]}" -eq 0 ] && exit 0 || exit 1
