// Get the canvas and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const GRID_SIZE = 8; // Size of one pixel unit
const MOVE_SPEED = 4;
const DASH_SPEED = 8; // Dash speed is twice the normal move speed
const DASH_DURATION = 10; // How many frames the dash lasts
const DASH_COOLDOWN = 30; // Cooldown frames between dashes

// Game state
const gameState = {
    isInsideTrain: false,
    transitionAlpha: 0,
    isTransitioning: false,
    headDirection: 'center', // 'left', 'right', 'up', 'down', 'center'
    leftImageOpacity: 0,
    bottomImageOpacity: 0,
    rightImageOpacity: 0,
    upImageOpacity: 0
};

// Character
const character = {
    x: 100,
    y: 200,
    width: GRID_SIZE * 4,
    height: GRID_SIZE * 6,
    velocityX: 0,
    facingRight: true,
    isDashing: false,
    dashCooldown: 0,
    dashFramesLeft: 0
};

// Platform (positioned at 3/4 of the height)
const platform = {
    x: 0,
    y: window.innerHeight * 0.75,
    width: window.innerWidth * 3, // Platform is 3 screens wide
    height: 50
};

// Train settings
const trains = [
    {
        x: window.innerWidth * 0.1,
        y: platform.y - 70,
        width: window.innerWidth * 0.8,
        height: 60,
        carriages: 6,
        color: '#3F51B5', // Indigo
        trackNumber: 1,
        door: {
            carriageIndex: 2,
            x: 0, // Will be calculated
            y: 0, // Will be calculated
            width: 30,
            height: 40,
            isHighlighted: false
        },
        interior: {
            floorY: 0, // Will be calculated
            wallColor: '#303F9F',
            floorColor: '#1A237E',
            seatsColor: '#5C6BC0'
        }
    },
    {
        x: window.innerWidth * 1.2,
        y: platform.y - 70,
        width: window.innerWidth * 0.7,
        height: 60,
        carriages: 5,
        color: '#E53935', // Red
        trackNumber: 2
    },
    {
        x: window.innerWidth * 2.3,
        y: platform.y - 70,
        width: window.innerWidth * 0.6,
        height: 60,
        carriages: 4,
        color: '#43A047', // Green
        trackNumber: 3
    }
];

// Calculate door position for train 1
function updateDoorPosition() {
    const train = trains[0];
    const carriageWidth = train.width / train.carriages;
    train.door.x = train.x + train.door.carriageIndex * carriageWidth + carriageWidth / 2 - train.door.width / 2;
    train.door.y = train.y + train.height - train.door.height;
    train.interior.floorY = train.y + train.height - 5;
}

// Track signs (one for each train)
const trackSigns = [
    {
        x: window.innerWidth * 0.5,
        y: platform.y - 100,
        width: 60,
        height: 40,
        number: 1
    },
    {
        x: window.innerWidth * 1.5,
        y: platform.y - 100,
        width: 60,
        height: 40,
        number: 2
    },
    {
        x: window.innerWidth * 2.5,
        y: platform.y - 100,
        width: 60,
        height: 40,
        number: 3
    }
];

// Camera/viewport
const camera = {
    x: 0,
    width: window.innerWidth
};

// Set canvas dimensions to match window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update platform position when resizing
    platform.y = canvas.height * 0.75;
    platform.width = window.innerWidth * 3; // Maintain 3 screens width
    
    // Update trains position
    trains[0].y = platform.y - 70;
    trains[0].x = window.innerWidth * 0.1;
    trains[0].width = window.innerWidth * 0.8;
    
    trains[1].y = platform.y - 70;
    trains[1].x = window.innerWidth * 1.2;
    trains[1].width = window.innerWidth * 0.7;
    
    trains[2].y = platform.y - 70;
    trains[2].x = window.innerWidth * 2.3;
    trains[2].width = window.innerWidth * 0.6;
    
    // Update track signs
    trackSigns[0].y = platform.y - 100;
    trackSigns[0].x = window.innerWidth * 0.5;
    
    trackSigns[1].y = platform.y - 100;
    trackSigns[1].x = window.innerWidth * 1.5;
    
    trackSigns[2].y = platform.y - 100;
    trackSigns[2].x = window.innerWidth * 2.5;
    
    // Update camera width
    camera.width = window.innerWidth;
    
    // Make sure character stays on platform after resize
    if (!gameState.isInsideTrain) {
        character.y = platform.y - character.height;
    }
    
    // Ensure character is within world bounds after resize
    if (character.x > platform.width - character.width) {
        character.x = platform.width - character.width;
    }
    
    // Update door position
    updateDoorPosition();
}

// Initialize canvas size
resizeCanvas();
updateDoorPosition();

// Add event listener for window resize
window.addEventListener('resize', resizeCanvas);

// Controls
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    dash: false
};

// Event listeners for keyboard controls
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && gameState.isInsideTrain && !gameState.isTransitioning) {
        startTransition(false); // Exit the train
    }
    
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            keys.left = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'left';
            }
            break;
        case 'ArrowRight':
        case 'd':
            keys.right = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'right';
            }
            break;
        case 'ArrowUp':
        case 'w':
            keys.up = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'up';
            } else {
                checkDoorInteraction();
            }
            break;
        case 'ArrowDown':
        case 's':
            keys.down = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'down';
            }
            break;
        case 'Shift':
            if (character.dashCooldown === 0 && !gameState.isInsideTrain) {
                keys.dash = true;
                character.isDashing = true;
                character.dashFramesLeft = DASH_DURATION;
                character.dashCooldown = DASH_COOLDOWN;
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            keys.left = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'left') {
                gameState.headDirection = 'center';
            }
            break;
        case 'ArrowRight':
        case 'd':
            keys.right = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'right') {
                gameState.headDirection = 'center';
            }
            break;
        case 'ArrowUp':
        case 'w':
            keys.up = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'up') {
                gameState.headDirection = 'center';
            }
            break;
        case 'ArrowDown':
        case 's':
            keys.down = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'down') {
                gameState.headDirection = 'center';
            }
            break;
    }
});

// Check if the character is near the door and can interact with it
function checkDoorInteraction() {
    if (gameState.isTransitioning) return;

    const train = trains[0];
    const doorX = train.door.x;
    const doorWidth = train.door.width;
    
    // Calculate character's center
    const characterCenterX = character.x + character.width / 2;
    
    // Check if character is close to door
    const isNearDoor = Math.abs(characterCenterX - (doorX + doorWidth / 2)) < 30;
    
    if (isNearDoor) {
        // If outside train, enter. If inside, exit
        startTransition(!gameState.isInsideTrain);
    }
}

// Start transition between inside/outside train
function startTransition(enteringTrain) {
    gameState.isTransitioning = true;
    
    // Reset head direction when transitioning
    if (enteringTrain) {
        gameState.headDirection = 'center';
    }
    
    // Fade out
    let fadeInterval = setInterval(() => {
        gameState.transitionAlpha += 0.05;
        if (gameState.transitionAlpha >= 1) {
            clearInterval(fadeInterval);
            
            // Change state
            gameState.isInsideTrain = enteringTrain;
            
            // If entering train, position character inside
            if (enteringTrain) {
                character.x = window.innerWidth / 2 - character.width / 2;
                character.y = trains[0].interior.floorY - character.height;
            } else {
                // If exiting, position character outside door
                character.x = trains[0].door.x;
                character.y = platform.y - character.height;
            }
            
            // Fade in
            let fadeOutInterval = setInterval(() => {
                gameState.transitionAlpha -= 0.05;
                if (gameState.transitionAlpha <= 0) {
                    clearInterval(fadeOutInterval);
                    gameState.isTransitioning = false;
                    gameState.transitionAlpha = 0;
                }
            }, 30);
        }
    }, 30);
}

// Game loop
function update() {
    // If inside train, only handle the head directions and image fading
    if (gameState.isInsideTrain && !gameState.isTransitioning) {
        // Clear canvas
        ctx.fillStyle = '#4287f5'; // Blue background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw train interior with head
        drawTrainInterior();
        
        // Draw transition overlay if transitioning
        if (gameState.transitionAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${gameState.transitionAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Request next frame
        requestAnimationFrame(update);
        return;
    }

    // Handle dashing cooldown
    if (character.dashCooldown > 0) {
        character.dashCooldown--;
    }
    
    // Handle dash timing
    if (character.isDashing) {
        character.dashFramesLeft--;
        if (character.dashFramesLeft <= 0) {
            character.isDashing = false;
        }
    }
    
    // Only allow movement if not transitioning
    if (!gameState.isTransitioning) {
        // Handle horizontal movement
        character.velocityX = 0;
        
        if (keys.left) {
            character.velocityX = character.isDashing ? -DASH_SPEED : -MOVE_SPEED;
            character.facingRight = false;
        }
        if (keys.right) {
            character.velocityX = character.isDashing ? DASH_SPEED : MOVE_SPEED;
            character.facingRight = true;
        }
        
        // Update position
        character.x += character.velocityX;
        
        // Apply different boundary checks based on if inside or outside train
        if (gameState.isInsideTrain) {
            // Inside train boundaries - limit to visible screen
            if (character.x < 20) character.x = 20;
            if (character.x > canvas.width - character.width - 20) {
                character.x = canvas.width - character.width - 20;
            }
        } else {
            // Outside train boundaries - world limits
            if (character.x < 0) character.x = 0;
            if (character.x > platform.width - character.width) {
                character.x = platform.width - character.width;
            }
            
            // Place character on platform
            character.y = platform.y - character.height;
        }
    }
    
    // Update door highlight state - highlight when character is near
    if (!gameState.isInsideTrain) {
        const train = trains[0];
        const doorX = train.door.x;
        const doorWidth = train.door.width;
        const characterCenterX = character.x + character.width / 2;
        
        // Check if character is close to door
        train.door.isHighlighted = Math.abs(characterCenterX - (doorX + doorWidth / 2)) < 30;
    }
    
    // Camera follows character only when outside the train
    if (!gameState.isInsideTrain) {
        // Update camera to follow character
        camera.x = character.x - canvas.width / 2;
        
        // Keep camera within bounds
        if (camera.x < 0) camera.x = 0;
        if (camera.x > platform.width - canvas.width) {
            camera.x = platform.width - canvas.width;
        }
    }
    
    // Clear canvas
    ctx.fillStyle = '#87CEEB'; // Sky blue background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw platform scene
    // Draw platform (adjusted for camera)
    drawPlatform();
    
    // Draw trains (adjusted for camera)
    drawTrains();
    
    // Draw track signs (adjusted for camera)
    drawTrackSigns();
    
    // Draw character (pixel art style, adjusted for camera position)
    drawCharacter();
    
    // Draw transition overlay if transitioning
    if (gameState.transitionAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${gameState.transitionAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Request next frame
    requestAnimationFrame(update);
}

// Draw train interior with pixel head
function drawTrainInterior() {
    // Blue background
    ctx.fillStyle = '#4287f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update image opacities based on head direction
    updateImageOpacities();
    
    // Draw images based on direction (with proper opacity)
    drawDirectionalImages();
    
    // Draw pixel head in the center of the screen
    drawPixelHead();
    
    // Draw exit hint at the bottom of the screen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC to exit the train', canvas.width / 2, canvas.height - 20);
}

// Update image opacities based on head direction
function updateImageOpacities() {
    // Fade in/out left image
    if (gameState.headDirection === 'left') {
        gameState.leftImageOpacity = Math.min(1, gameState.leftImageOpacity + 0.05);
    } else {
        gameState.leftImageOpacity = Math.max(0, gameState.leftImageOpacity - 0.05);
    }
    
    // Fade in/out bottom image
    if (gameState.headDirection === 'down') {
        gameState.bottomImageOpacity = Math.min(1, gameState.bottomImageOpacity + 0.05);
    } else {
        gameState.bottomImageOpacity = Math.max(0, gameState.bottomImageOpacity - 0.05);
    }
    
    // Fade in/out right image
    if (gameState.headDirection === 'right') {
        gameState.rightImageOpacity = Math.min(1, gameState.rightImageOpacity + 0.05);
    } else {
        gameState.rightImageOpacity = Math.max(0, gameState.rightImageOpacity - 0.05);
    }
    
    // Fade in/out up image
    if (gameState.headDirection === 'up') {
        gameState.upImageOpacity = Math.min(1, gameState.upImageOpacity + 0.05);
    } else {
        gameState.upImageOpacity = Math.max(0, gameState.upImageOpacity - 0.05);
    }
}

// Draw images based on direction
function drawDirectionalImages() {
    // Left image - exam paper and pencils
    if (gameState.leftImageOpacity > 0) {
        ctx.globalAlpha = gameState.leftImageOpacity;
        
        // Draw a table
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(50, canvas.height/2 - 50, canvas.width/3, 20); // Table surface
        
        // Draw table legs
        ctx.fillRect(60, canvas.height/2 - 30, 10, 150); // Left leg
        ctx.fillRect(canvas.width/3 + 30, canvas.height/2 - 30, 10, 150); // Right leg
        
        // Draw exam paper
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(80, canvas.height/2 - 70, 180, 220);
        
        // Draw pencils
        ctx.fillStyle = '#FFC107'; // Yellow pencil
        ctx.fillRect(270, canvas.height/2 - 60, 8, 100);
        ctx.fillStyle = '#000000'; // Pencil tip
        ctx.fillRect(270, canvas.height/2 + 40, 8, 5);
        
        ctx.fillStyle = '#F44336'; // Red pencil
        ctx.fillRect(285, canvas.height/2 - 40, 8, 80);
        ctx.fillStyle = '#000000'; // Pencil tip
        ctx.fillRect(285, canvas.height/2 + 40, 8, 5);
        
        // Draw lines on the exam paper
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(90, canvas.height/2 - 50 + i * 20, 160, 1);
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    // Bottom image - hidden switch
    if (gameState.bottomImageOpacity > 0) {
        ctx.globalAlpha = gameState.bottomImageOpacity;
        
        // Draw floor
        ctx.fillStyle = '#8B4513'; // Brown floor
        ctx.fillRect(canvas.width/2 - 150, canvas.height - 200, 300, 200);
        
        // Draw hidden switch under a desk
        ctx.fillStyle = '#333333'; // Switch base
        ctx.fillRect(canvas.width/2 - 20, canvas.height - 80, 40, 10);
        
        // Switch lever
        ctx.fillStyle = '#FF0000'; // Red lever
        ctx.fillRect(canvas.width/2 - 5, canvas.height - 90, 10, 20);
        
        // Draw some debris/dust around to show it's hidden
        ctx.fillStyle = '#D3D3D3';
        ctx.fillRect(canvas.width/2 - 40, canvas.height - 75, 15, 5);
        ctx.fillRect(canvas.width/2 + 25, canvas.height - 78, 20, 8);
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    // Optional: Right and Up images can be added here
}

// Draw pixel head
function drawPixelHead() {
    const headSize = Math.min(canvas.width, canvas.height) * 0.3;
    const headX = canvas.width / 2 - headSize / 2;
    const headY = canvas.height / 2 - headSize / 2;
    
    // Head offset based on direction
    let offsetX = 0;
    let offsetY = 0;
    
    switch(gameState.headDirection) {
        case 'left':
            offsetX = -20;
            break;
        case 'right':
            offsetX = 20;
            break;
        case 'up':
            offsetY = -20;
            break;
        case 'down':
            offsetY = 20;
            break;
    }
    
    // Draw head (face)
    ctx.fillStyle = '#FFA07A'; // Skin color
    ctx.fillRect(headX + offsetX, headY + offsetY, headSize, headSize);
    
    // Draw eyes based on direction
    ctx.fillStyle = '#000000';
    
    // Left eye
    let leftEyeX = headX + headSize * 0.25;
    let rightEyeX = headX + headSize * 0.75;
    let eyeY = headY + headSize * 0.4;
    let eyeSize = headSize * 0.1;
    
    // Adjust eye positions based on direction
    switch(gameState.headDirection) {
        case 'left':
            leftEyeX -= eyeSize;
            rightEyeX -= eyeSize;
            break;
        case 'right':
            leftEyeX += eyeSize;
            rightEyeX += eyeSize;
            break;
        case 'up':
            eyeY -= eyeSize;
            break;
        case 'down':
            eyeY += eyeSize;
            break;
    }
    
    ctx.fillRect(leftEyeX + offsetX, eyeY + offsetY, eyeSize, eyeSize);
    ctx.fillRect(rightEyeX + offsetX, eyeY + offsetY, eyeSize, eyeSize);
    
    // Draw mouth
    let mouthY = headY + headSize * 0.7;
    let mouthWidth = headSize * 0.4;
    let mouthHeight = headSize * 0.05;
    
    // Adjust mouth based on direction
    switch(gameState.headDirection) {
        case 'up':
            mouthHeight = headSize * 0.02; // Smaller mouth when looking up
            break;
        case 'down':
            mouthHeight = headSize * 0.08; // Bigger mouth when looking down
            break;
    }
    
    ctx.fillRect(headX + headSize/2 - mouthWidth/2 + offsetX, 
                mouthY + offsetY, 
                mouthWidth, 
                mouthHeight);
    
    // Draw hair
    ctx.fillStyle = '#8B4513'; // Brown hair
    ctx.fillRect(headX + offsetX, headY + offsetY, headSize, headSize * 0.2);
    
    // Draw ears
    ctx.fillStyle = '#FFA07A'; // Skin color
    ctx.fillRect(headX + offsetX - 10, headY + offsetY + headSize * 0.3, 10, headSize * 0.3);
    ctx.fillRect(headX + offsetX + headSize, headY + offsetY + headSize * 0.3, 10, headSize * 0.3);
}

// Draw simple platform
function drawPlatform() {
    // Main platform
    ctx.fillStyle = '#8B4513'; // Brown for wooden platform base
    ctx.fillRect(platform.x - camera.x, platform.y, platform.width, platform.height);
    
    // Platform top edge (lighter color)
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(platform.x - camera.x, platform.y, platform.width, 10);
    
    // Draw platform sections for visual reference
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#A0522D' : '#8B4513';
        ctx.fillRect(window.innerWidth * i - camera.x, platform.y, 5, 10);
    }
}

// Draw trains
function drawTrains() {
    trains.forEach((train, index) => {
        const carriageWidth = train.width / train.carriages;
        
        // Draw each carriage
        for (let i = 0; i < train.carriages; i++) {
            const carriageX = train.x + i * carriageWidth - camera.x;
            
            // Skip if carriage is not visible
            if (carriageX + carriageWidth < 0 || carriageX > canvas.width) continue;
            
            // Main carriage body
            ctx.fillStyle = train.color;
            ctx.fillRect(carriageX, train.y, carriageWidth - 5, train.height);
            
            // Carriage connector
            if (i < train.carriages - 1) {
                ctx.fillStyle = '#1A237E';
                ctx.fillRect(carriageX + carriageWidth - 5, train.y + 15, 5, 30);
            }
            
            // Front of train (first carriage)
            if (i === 0) {
                ctx.fillStyle = '#1A237E';
                ctx.fillRect(carriageX, train.y, 10, train.height);
                
                // Train lights
                ctx.fillStyle = '#FFF9C4';
                ctx.fillRect(carriageX + 2, train.y + 10, 4, 4);
                ctx.fillRect(carriageX + 2, train.y + train.height - 14, 4, 4);
            }
            
            // Draw door if this is the right carriage of train 1
            if (index === 0 && i === train.door.carriageIndex) {
                // Door
                ctx.fillStyle = train.door.isHighlighted ? '#4DD0E1' : '#1A237E';
                ctx.fillRect(train.door.x - camera.x, train.door.y, train.door.width, train.door.height);
                
                // Door handle
                ctx.fillStyle = '#FFC107';
                ctx.fillRect(train.door.x + train.door.width - 8 - camera.x, train.door.y + 20, 5, 10);
                
                // "Press Up" hint if door is highlighted
                if (train.door.isHighlighted) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Press Up', train.door.x + train.door.width/2 - camera.x, train.door.y - 10);
                }
            }
            
            // Windows (except for door carriage)
            if (!(index === 0 && i === train.door.carriageIndex)) {
                ctx.fillStyle = '#81D4FA'; // Light blue for windows
                for (let j = 0; j < 3; j++) {
                    const windowX = carriageX + 20 + j * 25;
                    if (windowX + 15 > 0 && windowX < canvas.width) {
                        ctx.fillRect(windowX, train.y + 15, 15, 20);
                    }
                }
            }
            
            // Wheels
            ctx.fillStyle = '#263238';
            if (carriageX + carriageWidth/4 > 0 && carriageX + carriageWidth/4 < canvas.width) {
                ctx.beginPath();
                ctx.arc(carriageX + carriageWidth/4, train.y + train.height, 8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            if (carriageX + carriageWidth*3/4 > 0 && carriageX + carriageWidth*3/4 < canvas.width) {
                ctx.beginPath();
                ctx.arc(carriageX + carriageWidth*3/4, train.y + train.height, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

// Draw track signs
function drawTrackSigns() {
    trackSigns.forEach(sign => {
        const signX = sign.x - camera.x;
        
        // Skip if sign is not visible
        if (signX + sign.width < 0 || signX > canvas.width) return;
        
        // Sign background
        ctx.fillStyle = '#303F9F';
        ctx.fillRect(signX, sign.y, sign.width, sign.height);
        
        // Sign border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(signX, sign.y, sign.width, sign.height);
        
        // Sign text (track number)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${sign.number}`, signX + sign.width/2, sign.y + sign.height/2);
        
        // Sign post
        ctx.fillStyle = '#616161';
        ctx.fillRect(signX + sign.width/2 - 5, sign.y + sign.height, 10, platform.y - sign.y - sign.height);
    });
}

// Draw character in pixel art style
function drawCharacter() {
    // Adjust position based on whether inside or outside train
    const screenX = gameState.isInsideTrain ? character.x : character.x - camera.x;
    
    // Body
    ctx.fillStyle = character.isDashing ? '#4dabf5' : '#3498db'; // Brighter blue if dashing
    ctx.fillRect(
        screenX + GRID_SIZE, 
        character.y + GRID_SIZE * 2, 
        character.width - GRID_SIZE * 2, 
        character.height - GRID_SIZE * 2
    );
    
    // Head
    ctx.fillStyle = '#FFA07A'; // Light skin tone
    ctx.fillRect(
        screenX + GRID_SIZE, 
        character.y, 
        character.width - GRID_SIZE * 2, 
        GRID_SIZE * 2
    );
    
    // Eyes
    ctx.fillStyle = '#000';
    if (character.facingRight) {
        ctx.fillRect(
            screenX + GRID_SIZE * 2, 
            character.y + GRID_SIZE / 2, 
            GRID_SIZE / 2, 
            GRID_SIZE / 2
        );
    } else {
        ctx.fillRect(
            screenX + GRID_SIZE * 1.5, 
            character.y + GRID_SIZE / 2, 
            GRID_SIZE / 2, 
            GRID_SIZE / 2
        );
    }
    
    // Legs
    ctx.fillStyle = '#2c3e50'; // Dark pants
    ctx.fillRect(
        screenX + GRID_SIZE, 
        character.y + character.height - GRID_SIZE * 2, 
        GRID_SIZE, 
        GRID_SIZE * 2
    );
    ctx.fillRect(
        screenX + character.width - GRID_SIZE * 2, 
        character.y + character.height - GRID_SIZE * 2, 
        GRID_SIZE, 
        GRID_SIZE * 2
    );
    
    // Add animation based on movement
    if (character.velocityX !== 0) {
        // Simple walking animation - alternate leg positions
        const time = Date.now() / 100;
        if (Math.floor(time) % 2 === 0) {
            ctx.fillRect(
                screenX + GRID_SIZE, 
                character.y + character.height - GRID_SIZE * 2, 
                GRID_SIZE, 
                GRID_SIZE * 2 + 2
            );
        } else {
            ctx.fillRect(
                screenX + character.width - GRID_SIZE * 2, 
                character.y + character.height - GRID_SIZE * 2, 
                GRID_SIZE, 
                GRID_SIZE * 2 + 2
            );
        }
    }
    
    // Draw dash cooldown indicator if applicable
    if (character.dashCooldown > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(
            screenX, 
            character.y - 10, 
            (character.width * (DASH_COOLDOWN - character.dashCooldown)) / DASH_COOLDOWN, 
            5
        );
    }
}

// Start the game loop immediately when the page loads
window.onload = () => {
    update();
}; 