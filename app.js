// 应用状态
const appState = {
    selectedCharacter: null,
    currentSessionId: null,
    apiConfig: null,
    balloons: new Map(), // 存储所有气球数据 {id: {x, y, text, parentId, connections}}
    balloonIdCounter: 0,
    conversations: []
};

// DOM 元素
const elements = {};

// 初始化 DOM 元素引用
function initElements() {
    elements.characterSelection = document.getElementById('characterSelection');
    elements.mainContent = document.getElementById('mainContent');
    elements.characterCards = document.querySelectorAll('.character-card');
    elements.characterAvatar = document.getElementById('characterAvatar');
    elements.balloonCanvas = document.getElementById('balloonCanvas');
    elements.problemInput = document.getElementById('problemInput');
    elements.submitBtn = document.getElementById('submitBtn');
    elements.conversationList = document.getElementById('conversationList');
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.settingsPanel = document.getElementById('settingsPanel');
    elements.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    elements.saveConfigBtn = document.getElementById('saveConfigBtn');
    elements.apiUrl = document.getElementById('apiUrl');
    elements.apiKey = document.getElementById('apiKey');
    elements.modelName = document.getElementById('modelName');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    
    console.log('DOM 元素初始化完成');
    console.log('找到角色卡片数量:', elements.characterCards.length);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 先初始化 DOM 元素引用
    initElements();
    
    // 然后初始化应用和事件监听器
    initializeApp();
    setupEventListeners();
});

// 初始化应用
function initializeApp() {
    // 检查是否有保存的角色选择
    const savedCharacter = localStorage.getItem('selectedCharacter');
    const savedSessionId = localStorage.getItem('currentSessionId');
    
    // 加载 API 配置
    loadApiConfig();
    
    // 如果已有配置，检查是否需要显示设置面板
    if (!appState.apiConfig) {
        // 首次使用，显示设置面板
        showSettingsPanel();
    }
    
    if (savedCharacter) {
        appState.selectedCharacter = savedCharacter;
        appState.currentSessionId = savedSessionId;
        showMainContent();
    } else {
        showCharacterSelection();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 角色选择 - 使用事件委托，更可靠
    console.log('设置角色选择事件监听器，找到', elements.characterCards.length, '个角色卡片');
    
    // 方法1: 直接绑定到每个卡片
    elements.characterCards.forEach((card, index) => {
        const character = card.dataset.character;
        console.log(`绑定角色卡片 ${index + 1}:`, character, card);
        
        if (!character) {
            console.warn('卡片缺少 data-character 属性:', card);
            return;
        }
        
        // 移除可能存在的旧监听器
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        // 绑定新监听器
        newCard.addEventListener('click', function(e) {
            console.log('✅ 点击事件触发! 角色:', character);
            e.preventDefault();
            e.stopPropagation();
            selectCharacter(character);
        });
        
        // 也绑定 mousedown 作为备用
        newCard.addEventListener('mousedown', function(e) {
            console.log('✅ 鼠标按下事件触发! 角色:', character);
            e.preventDefault();
            selectCharacter(character);
        });
        
        // 添加鼠标样式提示
        newCard.style.cursor = 'pointer';
        newCard.style.pointerEvents = 'auto';
    });
    
    // 方法2: 事件委托（作为备用）
    if (elements.characterSelection) {
        elements.characterSelection.addEventListener('click', function(e) {
            const card = e.target.closest('.character-card');
            if (card) {
                const character = card.dataset.character;
                if (character) {
                    console.log('✅ 事件委托捕获到点击! 角色:', character);
                    e.preventDefault();
                    e.stopPropagation();
                    selectCharacter(character);
                }
            }
        });
    }
    
    // 提交问题
    elements.submitBtn.addEventListener('click', handleSubmit);
    elements.problemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    });
    
    // 设置面板
    elements.settingsBtn.addEventListener('click', () => showSettingsPanel());
    elements.closeSettingsBtn.addEventListener('click', () => hideSettingsPanel());
    elements.saveConfigBtn.addEventListener('click', handleSaveConfig);
    
    // 气球画布点击事件
    elements.balloonCanvas.addEventListener('click', handleBalloonClick);
    
    // 窗口大小改变时重新绘制
    window.addEventListener('resize', () => {
        if (appState.balloons.size > 0) {
            drawBalloons();
        }
    });
}

// 显示角色选择界面
function showCharacterSelection() {
    elements.characterSelection.style.display = 'flex';
    elements.mainContent.style.display = 'none';
}

// 显示主内容
function showMainContent() {
    elements.characterSelection.style.display = 'none';
    elements.mainContent.style.display = 'block';
    
    // 设置角色头像
    const characterEmojis = {
        rabbit: '🐰',
        cat: '🐱',
        bear: '🐻',
        deer: '🦌',
        fox: '🦊'
    };
    elements.characterAvatar.textContent = characterEmojis[appState.selectedCharacter];
    
    // 使用 setTimeout 确保 DOM 已渲染
    setTimeout(() => {
        // 初始化画布
        initCanvas();
        
        // 如果有会话，加载历史数据
        if (appState.currentSessionId) {
            loadSessionData();
        } else if (appState.balloons.size === 0) {
            // 如果没有气球，创建初始气球
            createInitialBalloon();
        }
    }, 100);
}

// 选择角色
function selectCharacter(character) {
    console.log('开始选择角色:', character);
    
    if (!character) {
        console.error('角色参数为空');
        return;
    }
    
    try {
        appState.selectedCharacter = character;
        localStorage.setItem('selectedCharacter', character);
        
        console.log('创建新会话...');
        // 创建新会话（使用本地存储）
        const sessionId = createSession(character);
        appState.currentSessionId = sessionId;
        localStorage.setItem('currentSessionId', sessionId);
        console.log('会话创建成功:', sessionId);
        
        // 创建初始气球
        console.log('创建初始气球...');
        createInitialBalloon();
        
        console.log('显示主内容...');
        showMainContent();
        
        console.log('角色选择完成');
    } catch (error) {
        console.error('选择角色时出错:', error);
        alert('选择角色失败，请重试');
    }
}

// 创建会话（使用 localStorage）
function createSession(character) {
    const sessionId = 'session-' + Date.now();
    const sessionData = {
        id: sessionId,
        character: character,
        created_at: new Date().toISOString()
    };
    localStorage.setItem('session_' + sessionId, JSON.stringify(sessionData));
    return sessionId;
}

// 创建初始气球
function createInitialBalloon() {
    // 确保画布已初始化
    if (elements.balloonCanvas.width === 0) {
        initCanvas();
    }
    
    const canvas = elements.balloonCanvas;
    const centerX = canvas.width / 2;
    const topY = 100;
    
    const balloonId = 'initial-' + Date.now();
    appState.balloons.set(balloonId, {
        id: balloonId,
        x: centerX,
        y: topY,
        text: '点击我开始',
        parentId: null,
        connections: []
    });
    
    drawBalloons();
}

// 初始化画布
function initCanvas() {
    const canvas = elements.balloonCanvas;
    const container = canvas.parentElement;
    
    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawBalloons();
    }
    
    resizeCanvas();
}

// 绘制气球和连线
function drawBalloons() {
    const canvas = elements.balloonCanvas;
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制连线前，先进行布局优化（避免重叠）
    optimizeBalloonLayout();
    
    // 绘制微妙的背景网格（可选，更高级的感觉）
    drawSubtleGrid(ctx, canvas);
    
    // 绘制连线（使用更优雅的曲线，只绘制父子关系，不绘制所有连接）
    appState.balloons.forEach(balloon => {
        if (balloon.parentId) {
            const parent = appState.balloons.get(balloon.parentId);
            if (parent) {
                drawElegantLine(ctx, parent, balloon);
            }
        }
    });
    
    // 绘制气球（带层级，后绘制在上层）
    const balloonsArray = Array.from(appState.balloons.values());
    // 按层级排序，父节点先绘制
    balloonsArray.sort((a, b) => {
        if (a.parentId === null && b.parentId !== null) return -1;
        if (a.parentId !== null && b.parentId === null) return 1;
        return 0;
    });
    
    balloonsArray.forEach(balloon => {
        drawBalloon(ctx, balloon);
    });
}

// 绘制优雅的曲线连线（更简洁的设计）
function drawElegantLine(ctx, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 使用更平滑的贝塞尔曲线
    const curvature = Math.min(distance * 0.25, 60);
    const cp1x = from.x + dx * 0.5;
    const cp1y = from.y - curvature;
    const cp2x = to.x - dx * 0.5;
    const cp2y = to.y + curvature;
    
    // 使用更淡的连线颜色
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.2)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
    ctx.stroke();
}

// 绘制微妙的背景网格（更轻量）
function drawSubtleGrid(ctx, canvas) {
    // 移除网格，使用更简洁的背景
    // 或者使用非常淡的点状背景
    const dotSpacing = 40;
    ctx.fillStyle = 'rgba(255, 182, 193, 0.03)';
    
    for (let x = dotSpacing; x < canvas.width; x += dotSpacing) {
        for (let y = dotSpacing; y < canvas.height; y += dotSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// 优化节点布局，避免重叠（适配卡片式设计）
function optimizeBalloonLayout() {
    const canvas = elements.balloonCanvas;
    const cardWidth = 140;
    const cardHeight = 80;
    const minDistance = Math.max(cardWidth, cardHeight) + 30; // 卡片之间的最小距离
    const margin = Math.max(cardWidth, cardHeight) / 2 + 20;
    const maxIterations = 10;
    
    // 简单的力导向布局：让气球互相排斥
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let moved = false;
        
        appState.balloons.forEach((balloon, balloonId) => {
            let fx = 0, fy = 0; // 合力
            
            // 计算与其他所有气球的排斥力
            appState.balloons.forEach((otherBalloon, otherId) => {
                if (balloonId === otherId) return;
                
                const dx = balloon.x - otherBalloon.x;
                const dy = balloon.y - otherBalloon.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < minDistance && dist > 0) {
                    // 计算排斥力（距离越近，力越大）
                    const force = (minDistance - dist) / dist * 0.3;
                    fx += dx * force;
                    fy += dy * force;
                }
            });
            
            // 应用力，更新位置
            if (Math.abs(fx) > 0.1 || Math.abs(fy) > 0.1) {
                balloon.x += fx;
                balloon.y += fy;
                moved = true;
                
                // 确保在画布范围内
                balloon.x = Math.max(margin, Math.min(canvas.width - margin, balloon.x));
                balloon.y = Math.max(margin, Math.min(canvas.height - margin, balloon.y));
            }
        });
        
        // 如果没有移动，提前结束
        if (!moved) break;
    }
}

// 绘制单个节点（现代化卡片式设计）
function drawBalloon(ctx, balloon) {
    const { x, y, text } = balloon;
    const width = 140;
    const height = 80;
    const cornerRadius = 12;
    
    // 绘制卡片阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    // 绘制卡片背景（圆角矩形）
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x - width/2, y - height/2, width, height, cornerRadius);
    ctx.fill();
    
    // 重置阴影
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // 绘制左侧彩色条
    const accentGradient = ctx.createLinearGradient(
        x - width/2, y - height/2,
        x - width/2, y + height/2
    );
    accentGradient.addColorStop(0, '#ff9ec5');
    accentGradient.addColorStop(1, '#ff6bb5');
    
    ctx.fillStyle = accentGradient;
    roundRect(ctx, x - width/2, y - height/2, 4, height, cornerRadius);
    ctx.fill();
    
    // 绘制边框（非常细腻）
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, x - width/2, y - height/2, width, height, cornerRadius);
    ctx.stroke();
    
    // 文字（更现代的排版）
    ctx.fillStyle = '#2d2d2d';
    ctx.font = '500 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 文字换行处理
    const maxWidth = width - 20;
    const words = text.split('');
    let line = '';
    const lines = [];
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
            lines.push(line);
            line = words[i];
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    
    // 绘制文字（最多3行）
    const maxLines = 3;
    const startY = y - (lines.length - 1) * 8;
    lines.slice(0, maxLines).forEach((lineText, index) => {
        if (lineText.trim()) {
            ctx.fillText(lineText, x, startY + index * 16);
        }
    });
    
    // 如果超过3行，显示省略号
    if (lines.length > maxLines) {
        ctx.fillText('...', x, startY + maxLines * 16);
    }
}

// 绘制圆角矩形辅助函数
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// 处理气球点击（带视觉反馈）
function handleBalloonClick(event) {
    const canvas = elements.balloonCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 检查点击了哪个气球
    let clickedBalloon = null;
    let minDistance = Infinity;
    
    appState.balloons.forEach(balloon => {
        // 卡片式点击检测（矩形区域）
        const cardWidth = 140;
        const cardHeight = 80;
        const cardX = balloon.x - cardWidth/2;
        const cardY = balloon.y - cardHeight/2;
        
        if (x >= cardX && x <= cardX + cardWidth &&
            y >= cardY && y <= cardY + cardHeight) {
            clickedBalloon = balloon;
        }
    });
    
    // 排除初始气球（以 'initial-' 开头的）
    if (clickedBalloon && !clickedBalloon.id.startsWith('initial-')) {
        // 添加点击动画效果
        addClickAnimation(canvas, clickedBalloon.x, clickedBalloon.y);
        
        // 生成新的解决方案
        generateSolutions(clickedBalloon);
    }
}

// 添加点击动画效果（使用临时画布层）
let animationFrameId = null;
function addClickAnimation(canvas, x, y) {
    // 取消之前的动画
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    const ctx = canvas.getContext('2d');
    let radius = 0;
    const maxRadius = 70;
    const speed = 4;
    
    function animate() {
        // 先重绘所有内容
        drawBalloons();
        
        // 然后绘制动画效果
        ctx.save();
        const alpha = 1 - (radius / maxRadius);
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = 'rgba(255, 105, 180, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        radius += speed;
        if (radius < maxRadius) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            animationFrameId = null;
            // 动画结束后重绘一次
            drawBalloons();
        }
    }
    
    animate();
}

// 处理提交
async function handleSubmit() {
    const problem = elements.problemInput.value.trim();
    if (!problem) return;
    
    if (!appState.apiConfig) {
        alert('请先配置 API 信息');
        showSettingsPanel();
        return;
    }
    
    // 添加用户消息到对话队列
    addConversation('user', problem);
    
    // 清空输入框
    elements.problemInput.value = '';
    
    // 显示加载
    showLoading();
    
    // 创建流式输出的对话项
    let streamingItem = null;
    let streamingContent = '';
    
    try {
        // 调用 API 生成解决方案（流式输出）
        const solutions = await callApi(problem, (content) => {
            // 实时更新对话显示
            if (!streamingItem) {
                streamingItem = document.createElement('div');
                streamingItem.className = 'conversation-item assistant streaming';
                streamingItem.innerHTML = `
                    <div class="streaming-content">正在生成解决方案...</div>
                    <div class="timestamp">${new Date().toLocaleTimeString()}</div>
                `;
                elements.conversationList.appendChild(streamingItem);
                elements.conversationList.scrollTop = elements.conversationList.scrollHeight;
            }
            
            streamingContent = content;
            const contentDiv = streamingItem.querySelector('.streaming-content');
            if (contentDiv) {
                contentDiv.textContent = content || '正在生成解决方案...';
            }
            elements.conversationList.scrollTop = elements.conversationList.scrollHeight;
        });
        
        // 隐藏加载
        hideLoading();
        
        // 更新最终的对话内容
        if (streamingItem) {
            const contentDiv = streamingItem.querySelector('.streaming-content');
            if (contentDiv) {
                contentDiv.textContent = `我为你找到了 ${solutions.length} 个解决方案：\n${solutions.join('\n')}`;
            }
            streamingItem.classList.remove('streaming');
        } else {
            // 如果没有流式输出，添加普通对话
            addConversation('assistant', `我为你找到了 ${solutions.length} 个解决方案`);
        }
        
        // 创建初始气球（如果还没有）
        if (appState.balloons.size === 0) {
            createInitialBalloon();
        }
        
        // 找到初始气球或第一个气球作为父气球
        let parentBalloon = null;
        for (const balloon of appState.balloons.values()) {
            if (balloon.parentId === null) {
                parentBalloon = balloon;
                break;
            }
        }
        
        if (!parentBalloon) {
            parentBalloon = Array.from(appState.balloons.values())[0];
        }
        
        // 生成新气球
        const canvas = elements.balloonCanvas;
        const parentX = parentBalloon.x;
        const parentY = parentBalloon.y;
        
        // 卡片尺寸和最小间距
        const cardWidth = 140;
        const cardHeight = 80;
        const minDistance = Math.max(cardWidth, cardHeight) + 40;
        
        solutions.forEach((solution, index) => {
            // 计算初始位置（围绕父节点分布）
            let angle = (Math.PI * 2 * index) / solutions.length;
            let distance = minDistance + 20;
            let x = parentX + Math.cos(angle) * distance;
            let y = parentY + Math.sin(angle) * distance;
            
            // 碰撞检测和位置调整
            let attempts = 0;
            let foundPosition = false;
            
            while (!foundPosition && attempts < 50) {
                foundPosition = true;
                
                // 检查与所有已有节点的碰撞（矩形检测）
                for (const existingBalloon of appState.balloons.values()) {
                    const dx = Math.abs(x - existingBalloon.x);
                    const dy = Math.abs(y - existingBalloon.y);
                    
                    // 矩形碰撞检测
                    if (dx < cardWidth && dy < cardHeight) {
                        foundPosition = false;
                        distance += 20;
                        angle += Math.PI / 6;
                        x = parentX + Math.cos(angle) * distance;
                        y = parentY + Math.sin(angle) * distance;
                        break;
                    }
                }
                
                attempts++;
            }
            
            // 确保在画布范围内（留出边距）
            const margin = Math.max(cardWidth, cardHeight) / 2 + 20;
            x = Math.max(margin, Math.min(canvas.width - margin, x));
            y = Math.max(margin, Math.min(canvas.height - margin, y));
            
            const balloonId = 'balloon-' + (++appState.balloonIdCounter);
            const newBalloon = {
                id: balloonId,
                x: x,
                y: y,
                text: solution,
                parentId: parentBalloon.id,
                connections: [parentBalloon.id]
            };
            
            // 建立双向连接
            if (!parentBalloon.connections.includes(balloonId)) {
                parentBalloon.connections.push(balloonId);
            }
            
            // 连接到其他相关气球
            appState.balloons.forEach((otherBalloon, otherId) => {
                if (otherId !== balloonId && otherId !== parentBalloon.id) {
                    newBalloon.connections.push(otherId);
                    if (!otherBalloon.connections.includes(balloonId)) {
                        otherBalloon.connections.push(balloonId);
                    }
                }
            });
            
            appState.balloons.set(balloonId, newBalloon);
            
            // 保存到本地存储
            saveSolution(balloonId, solution, parentBalloon.id);
        });
        
        // 保存对话到本地存储
        saveConversation('user', problem);
        saveConversation('assistant', solutions.join('\n'));
        
        // 重新绘制
        drawBalloons();
        
    } catch (error) {
        hideLoading();
        console.error('生成解决方案失败:', error);
        alert('生成解决方案失败，请检查 API 配置');
    }
}

// 生成解决方案（点击气球时）
async function generateSolutions(parentBalloon) {
    if (!appState.apiConfig) {
        alert('请先配置 API 信息');
        showSettingsPanel();
        return;
    }
    
    showLoading();
    
    // 创建流式输出的对话项
    let streamingItem = null;
    
    try {
        const prompt = `基于这个解决方案"${parentBalloon.text}"，请提供3-5个相关的、更具体的解决方案。每个方案用简短的一句话描述，直接返回方案列表，不要其他说明。`;
        
        const solutions = await callApi(prompt, (content) => {
            // 实时更新对话显示
            if (!streamingItem) {
                streamingItem = document.createElement('div');
                streamingItem.className = 'conversation-item assistant streaming';
                streamingItem.innerHTML = `
                    <div class="streaming-content">正在生成相关解决方案...</div>
                    <div class="timestamp">${new Date().toLocaleTimeString()}</div>
                `;
                elements.conversationList.appendChild(streamingItem);
                elements.conversationList.scrollTop = elements.conversationList.scrollHeight;
            }
            
            const contentDiv = streamingItem.querySelector('.streaming-content');
            if (contentDiv) {
                contentDiv.textContent = content || '正在生成相关解决方案...';
            }
            elements.conversationList.scrollTop = elements.conversationList.scrollHeight;
        });
        
        hideLoading();
        
        // 更新最终的对话内容
        if (streamingItem) {
            const contentDiv = streamingItem.querySelector('.streaming-content');
            if (contentDiv) {
                contentDiv.textContent = `生成了 ${solutions.length} 个相关解决方案：\n${solutions.join('\n')}`;
            }
            streamingItem.classList.remove('streaming');
        }
        
        const canvas = elements.balloonCanvas;
        const parentX = parentBalloon.x;
        const parentY = parentBalloon.y;
        
        // 卡片尺寸和最小间距
        const cardWidth = 140;
        const cardHeight = 80;
        const minDistance = Math.max(cardWidth, cardHeight) + 40;
        
        solutions.forEach((solution, index) => {
            // 计算初始位置（围绕父节点分布）
            let angle = (Math.PI * 2 * index) / solutions.length;
            let distance = minDistance + 20;
            let x = parentX + Math.cos(angle) * distance;
            let y = parentY + Math.sin(angle) * distance;
            
            // 碰撞检测和位置调整
            let attempts = 0;
            let foundPosition = false;
            
            while (!foundPosition && attempts < 50) {
                foundPosition = true;
                
                // 检查与所有已有节点的碰撞（矩形检测）
                for (const existingBalloon of appState.balloons.values()) {
                    const dx = Math.abs(x - existingBalloon.x);
                    const dy = Math.abs(y - existingBalloon.y);
                    
                    // 矩形碰撞检测
                    if (dx < cardWidth && dy < cardHeight) {
                        foundPosition = false;
                        distance += 20;
                        angle += Math.PI / 6;
                        x = parentX + Math.cos(angle) * distance;
                        y = parentY + Math.sin(angle) * distance;
                        break;
                    }
                }
                
                attempts++;
            }
            
            // 确保在画布范围内（留出边距）
            const margin = Math.max(cardWidth, cardHeight) / 2 + 20;
            x = Math.max(margin, Math.min(canvas.width - margin, x));
            y = Math.max(margin, Math.min(canvas.height - margin, y));
            
            const balloonId = 'balloon-' + (++appState.balloonIdCounter);
            const newBalloon = {
                id: balloonId,
                x: x,
                y: y,
                text: solution,
                parentId: parentBalloon.id,
                connections: [parentBalloon.id]
            };
            
            // 建立双向连接
            if (!parentBalloon.connections.includes(balloonId)) {
                parentBalloon.connections.push(balloonId);
            }
            
            // 连接到其他相关气球
            appState.balloons.forEach((otherBalloon, otherId) => {
                if (otherId !== balloonId && otherId !== parentBalloon.id) {
                    newBalloon.connections.push(otherId);
                    if (!otherBalloon.connections.includes(balloonId)) {
                        otherBalloon.connections.push(balloonId);
                    }
                }
            });
            
            appState.balloons.set(balloonId, newBalloon);
            saveSolution(balloonId, solution, parentBalloon.id);
        });
        
        saveConversation('assistant', solutions.join('\n'));
        
        drawBalloons();
        
    } catch (error) {
        hideLoading();
        console.error('生成解决方案失败:', error);
        alert('生成解决方案失败，请检查 API 配置');
    }
}

// 调用 API（流式输出）
async function callApi(prompt, onUpdate = null) {
    // 验证配置
    if (!appState.apiConfig) {
        console.error('❌ API 配置不存在');
        throw new Error('API 配置不存在，请先配置 API 信息');
    }
    
    const { apiUrl, apiKey, modelName } = appState.apiConfig;
    
    // 验证配置完整性
    if (!apiUrl || !apiKey || !modelName) {
        const missing = [];
        if (!apiUrl) missing.push('API 地址');
        if (!apiKey) missing.push('API 密钥');
        if (!modelName) missing.push('模型名称');
        console.error('❌ API 配置不完整，缺少:', missing.join(', '));
        throw new Error(`API 配置不完整，缺少: ${missing.join(', ')}`);
    }
    
    console.log('🚀 开始调用 API...');
    console.log('📍 API 地址:', apiUrl);
    console.log('🤖 模型名称:', modelName);
    console.log('🔑 API 密钥长度:', apiKey.length, '字符');
    console.log('💬 提示内容:', prompt.substring(0, 50) + '...');
    
    try {
        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: `用户遇到了烦闷的事情，请提供3-5个实用的解决方案。每个方案用简短的一句话描述（不超过20字），直接返回方案列表，每行一个方案，不要编号和其他说明。\n\n用户的问题：${prompt}`
                }
            ],
            temperature: 0.7,
            stream: true  // 启用流式输出
        };
        
        console.log('📤 发送请求:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 收到响应，状态码:', response.status, response.statusText);
        console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API 请求失败:', response.status, errorText);
            throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
        }
        
        console.log('✅ API 调用成功，开始处理流式数据...');
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';
        let chunkCount = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('📊 流式数据接收完成，共接收', chunkCount, '个数据块');
                break;
            }
            
            chunkCount++;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n'); // SSE 格式通常用双换行分隔
            buffer = lines.pop() || ''; // 保留最后一个不完整的块
            
            for (const chunk of lines) {
                // 处理 SSE 格式 (data: {...})
                const dataLines = chunk.split('\n');
                for (const line of dataLines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '' || data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            let delta = '';
                            
                            // 解析不同格式的响应（兼容多种 API 格式）
                            if (json.choices && json.choices[0]) {
                                if (json.choices[0].delta && json.choices[0].delta.content) {
                                    delta = json.choices[0].delta.content;
                                } else if (json.choices[0].message && json.choices[0].message.content) {
                                    delta = json.choices[0].message.content;
                                }
                            } else if (json.data && json.data.choices && json.data.choices[0]) {
                                delta = json.data.choices[0].delta?.content || json.data.choices[0].message?.content || '';
                            } else if (json.content) {
                                // 直接包含 content 字段
                                delta = json.content;
                            }
                            
                            if (delta) {
                                fullContent += delta;
                                // 实时更新回调
                                if (onUpdate) {
                                    onUpdate(fullContent);
                                }
                                // 每接收一些内容就记录一次
                                if (fullContent.length % 50 === 0 || fullContent.length < 50) {
                                    console.log('📝 已接收内容长度:', fullContent.length, '字符');
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误，继续处理下一行
                            console.debug('解析流式数据失败:', e, line);
                        }
                    } else if (line.trim() && !line.startsWith(':')) {
                        // 尝试直接解析 JSON（某些 API 可能不使用 SSE 格式）
                        try {
                            const json = JSON.parse(line);
                            let delta = '';
                            if (json.choices && json.choices[0] && json.choices[0].delta) {
                                delta = json.choices[0].delta.content || '';
                            }
                            if (delta) {
                                fullContent += delta;
                                if (onUpdate) {
                                    onUpdate(fullContent);
                                }
                            }
                        } catch (e) {
                            // 忽略
                        }
                    }
                }
            }
        }
        
        // 处理剩余的 buffer
        if (buffer.trim()) {
            const dataLines = buffer.split('\n');
            for (const line of dataLines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data && data !== '[DONE]') {
                        try {
                            const json = JSON.parse(data);
                            let delta = '';
                            if (json.choices && json.choices[0] && json.choices[0].delta) {
                                delta = json.choices[0].delta.content || '';
                            }
                            if (delta) {
                                fullContent += delta;
                                if (onUpdate) {
                                    onUpdate(fullContent);
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
        }
        
        // 解析最终结果
        console.log('📄 完整接收内容:', fullContent);
        console.log('📄 内容长度:', fullContent.length);
        
        let solutions = fullContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.match(/^\d+[\.、]/) && line.length > 0)
            .slice(0, 5);
        
        console.log('🎯 解析出的解决方案数量:', solutions.length);
        console.log('🎯 解决方案列表:', solutions);
        
        if (solutions.length === 0) {
            console.warn('⚠️ 未能解析出解决方案，使用默认方案');
            solutions = ['尝试换个角度思考', '寻求朋友帮助', '给自己一些时间', '做点喜欢的事情', '保持积极心态'];
        }
        
        console.log('✅ API 调用完成，返回', solutions.length, '个解决方案');
        return solutions;
    } catch (error) {
        console.error('❌ API 调用错误:', error);
        console.error('❌ 错误详情:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw error;
    }
}

// 添加对话到队列
function addConversation(role, content) {
    const conversation = {
        role,
        content,
        timestamp: new Date().toLocaleTimeString()
    };
    
    appState.conversations.push(conversation);
    
    const item = document.createElement('div');
    item.className = `conversation-item ${role}`;
    item.innerHTML = `
        <div>${content}</div>
        <div class="timestamp">${conversation.timestamp}</div>
    `;
    
    elements.conversationList.appendChild(item);
    elements.conversationList.scrollTop = elements.conversationList.scrollHeight;
}

// 保存对话到本地存储
function saveConversation(role, content) {
    if (!appState.currentSessionId) return;
    
    try {
        const conversations = JSON.parse(localStorage.getItem('conversations_' + appState.currentSessionId) || '[]');
        conversations.push({
            role: role,
            content: content,
            created_at: new Date().toISOString()
        });
        localStorage.setItem('conversations_' + appState.currentSessionId, JSON.stringify(conversations));
    } catch (error) {
        console.error('保存对话失败:', error);
    }
}

// 保存解决方案到本地存储
function saveSolution(balloonId, solution, parentId) {
    if (!appState.currentSessionId) return;
    
    try {
        const solutions = JSON.parse(localStorage.getItem('solutions_' + appState.currentSessionId) || '[]');
        solutions.push({
            balloon_id: balloonId,
            solution_text: solution,
            parent_balloon_id: parentId,
            created_at: new Date().toISOString()
        });
        localStorage.setItem('solutions_' + appState.currentSessionId, JSON.stringify(solutions));
    } catch (error) {
        console.error('保存解决方案失败:', error);
    }
}

// 加载会话数据（从本地存储）
function loadSessionData() {
    if (!appState.currentSessionId) return;
    
    try {
        // 加载对话记录
        const conversations = JSON.parse(localStorage.getItem('conversations_' + appState.currentSessionId) || '[]');
        conversations.forEach(conv => {
            addConversation(conv.role, conv.content);
        });
        
        // 加载解决方案（气球）
        const solutions = JSON.parse(localStorage.getItem('solutions_' + appState.currentSessionId) || '[]');
        
        if (solutions && solutions.length > 0) {
            // 重建气球数据结构
            solutions.forEach(sol => {
                const canvas = elements.balloonCanvas;
                const x = Math.random() * (canvas.width - 120) + 60;
                const y = Math.random() * (canvas.height - 120) + 60;
                
                appState.balloons.set(sol.balloon_id, {
                    id: sol.balloon_id,
                    x: x,
                    y: y,
                    text: sol.solution_text,
                    parentId: sol.parent_balloon_id,
                    connections: []
                });
            });
            
            // 重建连接关系
            appState.balloons.forEach(balloon => {
                if (balloon.parentId) {
                    const parent = appState.balloons.get(balloon.parentId);
                    if (parent) {
                        balloon.connections.push(balloon.parentId);
                        if (!parent.connections.includes(balloon.id)) {
                            parent.connections.push(balloon.id);
                        }
                    }
                }
            });
            
            drawBalloons();
        }
    } catch (error) {
        console.error('加载会话数据失败:', error);
    }
}

// 显示/隐藏设置面板
function showSettingsPanel() {
    elements.settingsPanel.classList.add('active');
    // 如果有保存的配置，填充表单
    if (appState.apiConfig) {
        elements.apiUrl.value = appState.apiConfig.apiUrl || '';
        elements.apiKey.value = appState.apiConfig.apiKey || '';
        elements.modelName.value = appState.apiConfig.modelName || '';
    }
}

function hideSettingsPanel() {
    elements.settingsPanel.classList.remove('active');
}

// 保存配置
async function handleSaveConfig() {
    const apiUrl = elements.apiUrl.value.trim();
    const apiKey = elements.apiKey.value.trim();
    const modelName = elements.modelName.value.trim();
    
    if (!apiUrl || !apiKey || !modelName) {
        alert('请填写完整的配置信息');
        return;
    }
    
    appState.apiConfig = { apiUrl, apiKey, modelName };
    
    // 保存到本地存储
    localStorage.setItem('apiConfig', JSON.stringify(appState.apiConfig));
    
    alert('配置保存成功！');
    hideSettingsPanel();
}

// 加载 API 配置（从本地存储）
function loadApiConfig() {
    const saved = localStorage.getItem('apiConfig');
    if (saved) {
        try {
            appState.apiConfig = JSON.parse(saved);
            console.log('✅ API 配置已加载');
        } catch (error) {
            console.error('解析本地配置失败:', error);
        }
    } else {
        console.log('ℹ️ 未找到保存的 API 配置');
    }
}

// 显示/隐藏加载提示
function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

// 测试 API 连接
async function testApiConnection() {
    if (!appState.apiConfig) {
        console.error('❌ API 配置不存在');
        return { success: false, error: 'API 配置不存在' };
    }
    
    const { apiUrl, apiKey, modelName } = appState.apiConfig;
    
    console.log('🧪 开始测试 API 连接...');
    console.log('配置信息:', {
        apiUrl: apiUrl,
        modelName: modelName,
        apiKeyLength: apiKey ? apiKey.length : 0
    });
    
    // 验证配置完整性
    if (!apiUrl || !apiKey || !modelName) {
        const missing = [];
        if (!apiUrl) missing.push('API 地址');
        if (!apiKey) missing.push('API 密钥');
        if (!modelName) missing.push('模型名称');
        console.error('❌ 配置不完整，缺少:', missing.join(', '));
        return { success: false, error: `配置不完整: ${missing.join(', ')}` };
    }
    
    try {
        // 发送一个简单的测试请求
        const testResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content: '测试'
                    }
                ],
                stream: false,  // 测试时使用非流式，更容易看到结果
                max_tokens: 10
            })
        });
        
        console.log('📥 测试响应状态:', testResponse.status, testResponse.statusText);
        
        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('❌ API 测试失败:', errorText);
            return { 
                success: false, 
                error: `HTTP ${testResponse.status}: ${errorText}` 
            };
        }
        
        const data = await testResponse.json();
        console.log('✅ API 测试成功!');
        console.log('📄 响应数据:', data);
        
        return { success: true, data: data };
        
    } catch (error) {
        console.error('❌ API 测试异常:', error);
        return { 
            success: false, 
            error: error.message || '未知错误' 
        };
    }
}

// 在控制台暴露测试函数，方便调试
// 立即暴露函数，不等待 DOM 加载
window.testApi = testApiConnection;
console.log('💡 提示: 在控制台输入 testApi() 可以测试 API 连接');
console.log('✅ testApi 函数已加载，可以直接使用');

