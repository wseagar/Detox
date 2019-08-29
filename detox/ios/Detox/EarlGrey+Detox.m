//
//  EarlGrey+Detox.m
//  Detox
//
//  Created by Rotem Mizrachi Meidan on 05/03/2017.
//  Copyright © 2017 Wix. All rights reserved.
//

#import "EarlGrey+Detox.h"
#import "GREYMatchers+Detox.h"
#if ! LEGACY_EARLGREY_SYNC
@import ObjectiveC;
#import <DetoxSync/DetoxSync.h>
static const void* trackerKey = &trackerKey;
#endif

@implementation EarlGreyImpl (Detox)

#if LEGACY_EARLGREY_SYNC
- (void)detox_safeExecuteSync:(void(^)(void))block
{
	grey_execute_async(^{
		[[GREYUIThreadExecutor sharedInstance] executeSync:^{
			block();
		} error:NULL];
	});
}
#else
+ (void)load
{
	@autoreleasepool
	{
		Class cls = NSClassFromString(@"GREYZeroToleranceTimer");
		if(cls == nil)
		{
			return;
		}
		
		SEL sel1 = NSSelectorFromString(@"initWithInterval:target:");
		Method m1 = class_getInstanceMethod(cls, sel1);
		id (*orig)(id, SEL, CFTimeInterval, id) = (void*)method_getImplementation(m1);
		method_setImplementation(m1, imp_implementationWithBlock(^ (id _self, CFTimeInterval ti, id arg4) {
			id<DTXEventTracker> tracker = [DTXSyncManager trackEventWithObject:_self description:@"Earl Grey zero tolerance timer"];
			id rv = orig(_self, sel1, ti, arg4);
			objc_setAssociatedObject(rv, trackerKey, tracker, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
			return rv;
		}));
		
		SEL sel2 = NSSelectorFromString(@"invalidate");
		Method m2 = class_getInstanceMethod(cls, sel2);
		void (*orig2)(id, SEL) = (void*)method_getImplementation(m2);
		method_setImplementation(m2, imp_implementationWithBlock(^ (id _self) {
			id handler = [_self valueForKey:@"target"];
			orig2(_self, sel2);
			id<DTXEventTracker> tracker = objc_getAssociatedObject(_self, trackerKey);
			[tracker endTracking];
			handler = nil;
		}));
	}
}

#endif

- (GREYElementInteraction *)detox_selectElementWithMatcher:(id<GREYMatcher>)elementMatcher
{
    return [self selectElementWithMatcher:[GREYMatchers detoxMatcherAvoidingProblematicReactNativeElements:elementMatcher]];
}

@end
