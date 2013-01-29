define('common/object-pool', [], function () {
	function ObjectPool(objects) {
		this._objects = objects;

		for (var i = this._objects.length - 1; i >= 0; i--) {
			this._objects[i].next = i === this._objects.length - 1 ? null : this._objects[i+1];
		}

		this.activeList = {};
		this.activeList.next = this.activeList;
		this.activeList.prev = this.activeList;
		this.freeList = this._objects[0];
	}

	ObjectPool.prototype.alloc = function () {
		if (!this.freeList) {
			// this.free(this.activeList.prev);
			return null;
		}

		var obj = this.freeList;
		this.freeList = this.freeList.next;

		// Reset the object we grabbed.
		if (obj.reset) {
			obj.reset();
		}

		// Link to the active list.
		obj.next = this.activeList.next;
		obj.prev = this.activeList;

		// Add to the head of the active list.
		this.activeList.next.prev = obj;
		this.activeList.next = obj;

		return obj;
	};

	ObjectPool.prototype.free = function (obj) {
		if (!obj.prev) {
			console.log('free: not active');
			return;
		}

		// Remove from the doubly linked active list.
		obj.prev.next = obj.next;
		obj.next.prev = obj.prev;

		// The free list is only singly linked.
		obj.next = this.freeList;
		this.freeList = obj;
	};

	return ObjectPool;
});