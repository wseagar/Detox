//
//  EarlGrey+Detox.h
//  Detox
//
//  Created by Rotem Mizrachi Meidan on 05/03/2017.
//  Copyright © 2017 Wix. All rights reserved.
//

@import Foundation;
#import <EarlGrey/EarlGrey.h>

@interface EarlGreyImpl (Detox)

#if LEGACY_EARLGREY_SYNC
- (void)detox_safeExecuteSync:(void(^)(void))block;
#endif
- (GREYElementInteraction *)detox_selectElementWithMatcher:(id<GREYMatcher>)elementMatcher;

@end
