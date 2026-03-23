// ai.js
// Simple Bot brains to help balance the tower when players are missing

class BotController {
    constructor(slotIndex, difficulty = 1) {
        this.slot = slotIndex;
        this.difficulty = difficulty; // 0=Rookie, 1=Normal, 2=Smart
        this.state = this.getEmptyState();
        
        // Behavioral timers
        this.thinkTimer = 0;
        this.targetX = null;
        this.targetObject = null;
        this.stateMachine = 'IDLE'; // IDLE, MOVE_TO_WEIGHT, GRAB_JUNK, THROW_JUNK
    }

    getEmptyState() {
        return {
            left: false, right: false,
            jump: false, jumpJustPressed: false,
            action1: false, action1JustPressed: false,
            action2: false, action2JustPressed: false,
            bumperLJustPressed: false, bumperRJustPressed: false,
            startJustPressed: false
        };
    }

    update(playerRef, gameBalance, towerCenterX, objects, dangerLevel) {
        this.state = this.getEmptyState();
        
        // Don't do much if dead/falling
        if (playerRef.y > towerCenterX + 800) return;

        this.thinkTimer--;
        
        let pCenterX = playerRef.x + playerRef.w/2;
        
        // High danger: Run to the opposite side of the lean
        // Rookie only panics at level 3, Normal at 2, Smart at 1
        let panicThreshold = this.difficulty === 0 ? 3 : (this.difficulty === 1 ? 2 : 1);
        if (dangerLevel >= panicThreshold) {
            this.stateMachine = 'MOVE_TO_WEIGHT';
            // Smart bots don't go as far to edge so they don't overcorrect
            let runDist = this.difficulty === 2 ? 100 : 150;
            this.targetX = towerCenterX + (gameBalance < 0 ? runDist : -runDist);
        } else if (this.thinkTimer <= 0) {
            // Think faster if smarter
            let baseThink = this.difficulty === 0 ? 90 : (this.difficulty === 1 ? 60 : 30);
            this.thinkTimer = baseThink + Utils.randomInt(0, 30);
            
            if (this.stateMachine === 'IDLE' || this.stateMachine === 'MOVE_TO_WEIGHT') {
                // Find loose junk
                let myFloorY = playerRef.y;
                let nearbyJunk = objects.filter(o => 
                    !o.heldBy && Math.abs(o.y - myFloorY) < 100 && o.mass < 60
                );
                
                // Smart bots try to find the heaviest bad junk
                if (this.difficulty === 2) {
                     nearbyJunk.sort((a,b) => b.mass - a.mass);
                }
                
                if (nearbyJunk.length > 0 && (this.difficulty > 0 || Math.random() < 0.5)) {
                    this.stateMachine = 'GRAB_JUNK';
                    this.targetObject = nearbyJunk[0];
                    this.targetX = this.targetObject.x + this.targetObject.w/2;
                } else {
                    this.stateMachine = 'MOVE_TO_WEIGHT';
                    
                    if (this.difficulty === 2 && dangerLevel === 0) {
                        // Smart bots stay center when perfectly fine
                        this.targetX = towerCenterX + Utils.random(-15, 15);
                    } else {
                        // Rookie bots sometimes run the wrong way!
                        let dir = gameBalance < 0 ? 1 : -1;
                        if (this.difficulty === 0 && Math.random() < 0.2) dir *= -1;
                        
                        this.targetX = towerCenterX + (dir * 80) + Utils.random(-40, 40);
                    }
                }
            }
        }

        // Execute State
        if (this.stateMachine === 'MOVE_TO_WEIGHT' || this.stateMachine === 'GRAB_JUNK') {
            
            // Rookie bots randomly jump sometimes
            if (this.difficulty === 0 && Math.random() < 0.005) {
                this.state.jumpJustPressed = true;
            }
            if (this.targetX !== null) {
                let dist = this.targetX - pCenterX;
                if (Math.abs(dist) > 15) {
                    if (dist < 0) this.state.left = true;
                    if (dist > 0) this.state.right = true;
                } else if (this.stateMachine === 'GRAB_JUNK' && this.targetObject && !playerRef.heldObject) {
                    this.state.action1JustPressed = true;
                    this.stateMachine = 'THROW_JUNK';
                    this.thinkTimer = 10;
                }
            }
            
            // Hop over gaps occasionally?
            if (Math.random() < 0.01 && (this.state.left || this.state.right)) {
                this.state.jumpJustPressed = true;
            }
        }
        
        if (this.stateMachine === 'THROW_JUNK') {
            if (playerRef.heldObject) {
                // Rookie bots might accidentally drop instead of throw
                if (this.difficulty === 0 && Math.random() < 0.1) {
                     this.state.action1JustPressed = true;
                     this.stateMachine = 'IDLE';
                     this.thinkTimer = 30;
                     return;
                }
                
                // Determine which way to throw to help balance
                let throwDir = gameBalance < 0 ? 1 : -1;
                
                // Smart bots sometimes reposition to throw further from center if needed? Complex. 
                // Just let them throw.
                
                if (playerRef.facing !== throwDir) {
                    if (throwDir === 1) this.state.right = true;
                    else this.state.left = true;
                } else {
                    this.state.action2JustPressed = true;
                    this.stateMachine = 'IDLE';
                    this.thinkTimer = this.difficulty === 2 ? 10 : 30; // 
                }
            } else {
                this.stateMachine = 'IDLE'; // missed grab
            }
        }
    }
}